import { AUDIT_AI_MAX_CONTEXT_CHARS, AUDIT_AI_MAX_RECORDS_PER_SECTION, AUDIT_AI_MIN_RECORDS_FLOOR, EQUIPMENT_AI_SECTIONS } from "./audit-ai-config";
import { compactQuestionData, type CompactDataStats } from "./audit-ai-projection";
import {
  extractQuestionPayload,
  type AuditQuestionDefinition,
  type LoadedAuditContext,
} from "./audit-questions";

export interface AuditContextMeta {
  totalRecords: number;
  includedRecords: number;
  truncated: boolean;
  payloadTruncated: boolean;
  compactMode: boolean;
  charCount: number;
  maxChars: number;
  map_reduce?: boolean;
  chunks_processed?: number;
}

export interface CompactAuditContextResult {
  payload: unknown;
  json: string;
  meta: AuditContextMeta;
  stats: CompactDataStats;
}

function countTotalRecords(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const d = data as Record<string, unknown>;
  if (d.stats && typeof d.stats === "object") {
    const s = d.stats as CompactDataStats;
    if (typeof s.record_count === "number") return s.record_count;
  }
  if (Array.isArray(d.audit_records)) return d.audit_records.length;
  if (Array.isArray(d.records)) return d.records.length;
  if (Array.isArray(d.utility_accounts)) {
    return (d.utility_accounts as unknown[]).reduce<number>((sum, nest) => {
      if (!nest || typeof nest !== "object") return sum;
      const br = (nest as Record<string, unknown>).billing_records;
      return sum + (Array.isArray(br) ? br.length : 0);
    }, 0);
  }
  return 0;
}

function stripEquipmentIfNeeded(
  payload: Record<string, unknown>,
  maxChars: number,
  questionId?: string,
): boolean {
  if (questionId && EQUIPMENT_AI_SECTIONS.has(questionId)) return false;

  let json = JSON.stringify(payload);
  if (json.length <= maxChars) return false;
  if (payload.data && typeof payload.data === "object") {
    const data = payload.data as Record<string, unknown>;
    if (data.equipment) {
      delete data.equipment;
      json = JSON.stringify(payload);
    }
  }
  return json.length > maxChars;
}

export function buildCompactAuditContext(
  context: LoadedAuditContext,
  question: AuditQuestionDefinition,
  options?: { maxChars?: number; maxRecords?: number },
): CompactAuditContextResult {
  const maxChars = options?.maxChars ?? AUDIT_AI_MAX_CONTEXT_CHARS;
  const maxRecords = options?.maxRecords ?? AUDIT_AI_MAX_RECORDS_PER_SECTION;

  const rawPayload = extractQuestionPayload(context, question);
  const raw = rawPayload as Record<string, unknown>;
  const { data: compactData, stats } = compactQuestionData(raw.data, question.id, maxRecords);

  let payload: Record<string, unknown> = {
    audit_type: raw.audit_type,
    facility: {
      name: (context.facility as { name?: string }).name,
      city: (context.facility as { city?: string }).city,
      facility_type: (context.facility as { facility_type?: string }).facility_type,
    },
    question: raw.question,
    data: compactData,
  };

  let payloadTruncated = stripEquipmentIfNeeded(payload, maxChars, question.id);
  let json = JSON.stringify(payload);

  if (json.length > maxChars) {
    const data = payload.data as Record<string, unknown>;
    if (Array.isArray(data.audit_records) && data.audit_records.length > AUDIT_AI_MIN_RECORDS_FLOOR) {
      let step = data.audit_records.length;
      while (step > AUDIT_AI_MIN_RECORDS_FLOOR && JSON.stringify(payload).length > maxChars) {
        step = Math.max(AUDIT_AI_MIN_RECORDS_FLOOR, Math.floor(step * 0.85));
        data.audit_records = (data.audit_records as unknown[]).slice(0, step);
        stats.included_count = step;
        stats.truncated = true;
      }
      json = JSON.stringify(payload);
    }
    if (JSON.stringify(payload).length > maxChars && !EQUIPMENT_AI_SECTIONS.has(question.id)) {
      json = json.slice(0, maxChars);
      payloadTruncated = true;
    } else if (JSON.stringify(payload).length > maxChars) {
      payloadTruncated = true;
    }
  }

  const totalRecords = stats.record_count || countTotalRecords(compactData);

  return {
    payload,
    json: typeof json === "string" ? json : JSON.stringify(payload),
    stats,
    meta: {
      totalRecords,
      includedRecords: stats.included_count,
      truncated: stats.truncated || payloadTruncated,
      payloadTruncated,
      compactMode: true,
      charCount: json.length,
      maxChars,
    },
  };
}

export function formatContextCoverage(meta: AuditContextMeta): string {
  const parts: string[] = [];
  if (meta.totalRecords > 0) {
    parts.push(`${meta.includedRecords} of ${meta.totalRecords} records`);
  }
  if (meta.truncated) parts.push("compact/sampled");
  if (meta.payloadTruncated) parts.push("payload capped");
  if (meta.map_reduce) parts.push(`map-reduce (${meta.chunks_processed ?? 0} chunks)`);
  return parts.join(" · ") || "compact mode";
}

/** Map backend meta snake_case to frontend camelCase */
export function normalizeContextMeta(
  meta: Record<string, unknown> | undefined,
): AuditContextMeta | undefined {
  if (!meta) return undefined;
  return {
    totalRecords: Number(meta.total_records ?? meta.totalRecords ?? 0),
    includedRecords: Number(meta.included_records ?? meta.includedRecords ?? 0),
    truncated: Boolean(meta.truncated),
    payloadTruncated: Boolean(meta.payload_truncated ?? meta.payloadTruncated),
    compactMode: Boolean(meta.compact_mode ?? meta.compactMode ?? true),
    charCount: Number(meta.char_count ?? meta.charCount ?? 0),
    maxChars: Number(meta.max_chars ?? meta.maxChars ?? AUDIT_AI_MAX_CONTEXT_CHARS),
    map_reduce: Boolean(meta.map_reduce),
    chunks_processed: Number(meta.chunks_processed ?? 0),
  };
}

/** @deprecated Use buildCompactAuditContext */
export function serializeAuditPayload(payload: unknown, maxChars = AUDIT_AI_MAX_CONTEXT_CHARS): string {
  const json = JSON.stringify(payload);
  if (json.length <= maxChars) return json;
  return json.slice(0, maxChars);
}
