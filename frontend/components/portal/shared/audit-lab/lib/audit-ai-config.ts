/** Max JSON chars sent to LLM for audit context (~15–20k tokens). */
export const AUDIT_AI_MAX_CONTEXT_CHARS = 80_000;

/** Max row arrays per section before sampling (newest first). */
export const AUDIT_AI_MAX_RECORDS_PER_SECTION = 200;

/** When user asks for full list/table. */
export const AUDIT_AI_MAX_RECORDS_LIST_MODE = 500;

export const AUDIT_AI_MIN_RECORDS_FLOOR = 25;
export const AUDIT_AI_MIN_RECORDS_FLOOR_LIST = 50;

/** Total records above this may trigger server map-reduce (Phase 3). */
export const AUDIT_AI_MAP_REDUCE_THRESHOLD = 100;

export const AUDIT_AI_RESPONSE_MAX_TOKENS = 4096;

export const AUDIT_AI_MAP_REDUCE_CHUNK_SIZE = 25;

/** Equipment sections that always include config + audit rows (never drop equipment). */
export const EQUIPMENT_AI_SECTIONS = new Set(["solar", "dg", "transformer", "pump"]);

export function wantsFullRecordList(text: string | undefined): boolean {
  if (!text) return false;
  return /\b(all|every|full|complete|entire|whole|list|table|tabular|show all|each row|all records|all rows)\b/i.test(
    text,
  );
}
