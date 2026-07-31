import {
  getElectricalEnergyAuditService,
  getElectricalSafetyAuditService,
} from "./audit.services.js";
import { createChatCompletion } from "../open-router/open-router.services.js";
import { buildRawQuestionPayload } from "./auditAiExtract.services.js";
import {
  buildCompactPayload,
  AUDIT_AI_MAP_REDUCE_THRESHOLD,
  AUDIT_AI_MAX_CONTEXT_CHARS,
} from "./auditAiContext.services.js";
import { getQuestionDefinition, AUDIT_AI_SYSTEM_PROMPT } from "./auditAiQuestions.js";
import { analyzeWithMapReduce } from "./auditAiMapReduce.services.js";

/**
 * Build compact AI context for a facility + question.
 */
export async function getAuditAiContextService({
  user,
  facilityIdString,
  auditType,
  questionId,
  options = {},
}) {
  const question = getQuestionDefinition(auditType, questionId);
  const { facility, snapshot } = await loadSnapshotForAuditType({
    user,
    facilityIdString,
    auditType,
  });

  const rawPayload = buildRawQuestionPayload({
    auditType,
    facility,
    snapshot,
    question,
  });

  const compact = buildCompactPayload(rawPayload, {
    max_chars: options.max_chars,
    max_records: options.max_records,
    list_mode: options.list_mode,
    user_text: options.user_text ?? "",
  });

  return {
    question,
    compact_payload: compact.compact_payload,
    meta: compact.meta,
    stats: compact.stats,
  };
}

/**
 * Analyze audit data with compaction and optional map-reduce.
 */
export async function analyzeAuditAiService({
  user,
  facilityIdString,
  auditType,
  questionId,
  followUpText,
  priorTurns = [],
  options = {},
}) {
  const question = getQuestionDefinition(auditType, questionId);
  const { compact_payload, meta, stats } = await getAuditAiContextService({
    user,
    facilityIdString,
    auditType,
    questionId,
    options: {
      ...options,
      user_text: [followUpText, question.prompt].filter(Boolean).join(" "),
    },
  });

  const json = JSON.stringify(compact_payload);
  const totalRecords = stats.record_count ?? meta.total_records ?? 0;
  const useMapReduce =
    options.force_map_reduce === true ||
    (totalRecords >= AUDIT_AI_MAP_REDUCE_THRESHOLD &&
      (meta.payload_truncated || meta.truncated));

  let result;
  if (useMapReduce && totalRecords > AUDIT_AI_MAP_REDUCE_THRESHOLD) {
    result = await analyzeWithMapReduce({
      questionPrompt: followUpText?.trim() ? followUpText : question.prompt,
      compactPayload: compact_payload,
      json,
      meta,
    });
  } else {
    const messages = buildServerAnalysisMessages({
      questionPrompt: question.prompt,
      json,
      priorTurns,
      followUpText,
      isFollowUp: Boolean(followUpText?.trim() && priorTurns.length > 0),
    });

    const completion = await createChatCompletion(
      [{ role: "system", content: AUDIT_AI_SYSTEM_PROMPT }, ...messages],
      { temperature: 0.1, max_tokens: options.max_tokens },
    );

    const raw = completion?.choices?.[0]?.message?.content ?? "";
    result = {
      structured: parseJsonContent(raw),
      raw,
      map_reduce: false,
      chunks_processed: 0,
    };
  }

  return {
    question,
    structured: result.structured,
    raw: result.raw,
    meta: {
      ...meta,
      map_reduce: result.map_reduce,
      chunks_processed: result.chunks_processed,
    },
  };
}

async function loadSnapshotForAuditType({ user, facilityIdString, auditType }) {
  if (auditType === "Electrical Energy Audit") {
    const snapshot = await getElectricalEnergyAuditService({ user, facilityIdString });
    return { facility: snapshot.facility, snapshot };
  }
  if (auditType === "Electrical Safety Audit") {
    const snapshot = await getElectricalSafetyAuditService({ user, facilityIdString });
    return { facility: snapshot.facility, snapshot };
  }
  const { resolveAccessibleFacility } = await import("../../services/authorization/index.js");
  const facility = await resolveAccessibleFacility(user, facilityIdString);
  if (!facility) {
    const err = new Error("Facility not found or access denied");
    err.statusCode = 404;
    throw err;
  }
  return { facility, snapshot: null };
}

function parseJsonContent(raw) {
  const trimmed = String(raw || "").trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] ?? trimmed).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function buildServerAnalysisMessages({
  questionPrompt,
  json,
  priorTurns,
  followUpText,
  isFollowUp,
}) {
  const messages = [];

  if (!isFollowUp) {
    messages.push({
      role: "user",
      content: `${questionPrompt}\n\nAudit data (JSON):\n${json}`,
    });
  } else {
    messages.push({
      role: "user",
      content: `${questionPrompt}\n\n[Audit data was provided in the first message of this thread.]`,
    });
  }

  for (const turn of priorTurns) {
    messages.push(turn);
  }

  if (followUpText?.trim()) {
    messages.push({
      role: "user",
      content: `${followUpText.trim()}\n\nReminder: Answer ONLY from the audit JSON in the first message.`,
    });
  }

  return messages;
}
