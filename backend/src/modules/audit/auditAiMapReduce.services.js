import { createChatCompletion } from "../open-router/open-router.services.js";
import {
  AUDIT_AI_MAP_REDUCE_CHUNK_SIZE,
  AUDIT_AI_RESPONSE_MAX_TOKENS,
} from "./auditAiContext.services.js";

const PARTIAL_SYSTEM_PROMPT = `You are Shakti AI analyzing ONE CHUNK of audit data.
Answer ONLY from the JSON chunk. No assumptions.
Respond ONLY with valid JSON:
{
  "chunk_summary": "2 sentences",
  "findings": [{ "title": "", "detail": "", "severity": "high|medium|low|info", "data_reference": "" }],
  "metrics": [{ "label": "", "value": "" }],
  "tables": [{ "title": "", "columns": [], "rows": [] }]
}`;

const MERGE_SYSTEM_PROMPT = `You are Shakti AI merging partial audit analyses into one final report.
Combine chunk results without duplicating findings. Sum/average metrics where appropriate.
Respond ONLY with valid JSON matching the full audit schema:
{
  "summary": "",
  "data_availability": "",
  "findings": [],
  "recommendations": [],
  "metrics": [],
  "tables": [],
  "charts": []
}
Use ONLY information from the partial results provided.`;

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

function extractRecordArray(compactPayload) {
  const data = compactPayload?.data;
  if (!data) return [];
  if (Array.isArray(data.audit_records)) return data.audit_records;
  if (Array.isArray(data.records)) return data.records;
  if (Array.isArray(data.utility_accounts)) {
    return data.utility_accounts.flatMap((n) => n.billing_records || []);
  }
  return [];
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

/**
 * Map-reduce analysis when record count exceeds budget after compaction.
 * @param {object} args
 * @param {string} args.questionPrompt
 * @param {object} args.compactPayload
 * @param {string} args.json
 * @param {object} args.meta
 */
export async function analyzeWithMapReduce({
  questionPrompt,
  compactPayload,
  json,
  meta,
}) {
  const records = extractRecordArray(compactPayload);
  const chunks = chunkArray(records, AUDIT_AI_MAP_REDUCE_CHUNK_SIZE);
  const partials = [];

  for (let i = 0; i < chunks.length; i += 1) {
    const chunkPayload = {
      ...compactPayload,
      data: {
        ...compactPayload.data,
        stats: {
          ...(compactPayload.data?.stats || {}),
          chunk_index: i + 1,
          chunk_total: chunks.length,
        },
        audit_records: chunks[i],
        records: chunks[i],
      },
    };

    const completion = await createChatCompletion(
      [
        { role: "system", content: PARTIAL_SYSTEM_PROMPT },
        {
          role: "user",
          content: `${questionPrompt}\n\nChunk ${i + 1}/${chunks.length}:\n${JSON.stringify(chunkPayload)}`,
        },
      ],
      { temperature: 0.1, max_tokens: 2048 },
    );

    const parsed = parseJsonContent(completion?.choices?.[0]?.message?.content);
    if (parsed) partials.push(parsed);
  }

  const mergeCompletion = await createChatCompletion(
    [
      { role: "system", content: MERGE_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Question: ${questionPrompt}\n\nPartial analyses (${partials.length} chunks):\n${JSON.stringify(partials)}\n\nCoverage meta: ${JSON.stringify(meta)}`,
      },
    ],
    { temperature: 0.1, max_tokens: AUDIT_AI_RESPONSE_MAX_TOKENS },
  );

  const merged = parseJsonContent(mergeCompletion?.choices?.[0]?.message?.content);
  return {
    structured: merged,
    raw: mergeCompletion?.choices?.[0]?.message?.content ?? "",
    map_reduce: true,
    chunks_processed: chunks.length,
  };
}

export async function analyzeSinglePass({
  systemPrompt,
  questionPrompt,
  json,
}) {
  const completion = await createChatCompletion(
    [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `${questionPrompt}\n\nAudit data (JSON):\n${json}`,
      },
    ],
    { temperature: 0.1, max_tokens: AUDIT_AI_RESPONSE_MAX_TOKENS },
  );

  const raw = completion?.choices?.[0]?.message?.content ?? "";
  return {
    structured: parseJsonContent(raw),
    raw,
    map_reduce: false,
    chunks_processed: 0,
  };
}
