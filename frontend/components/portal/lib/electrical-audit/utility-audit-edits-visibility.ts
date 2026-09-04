import { type ClassValue } from "clsx";
import { cn } from "@/components/portal/lib/utils";

type AuditCompletenessRecord = {
  is_completed?: boolean | string | null;
};

/** Normalize API/multipart values for audit record completion. */
export function isAuditRecordMarkedCompleted(
  record?: AuditCompletenessRecord | null,
): boolean {
  const value = record?.is_completed;
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  return false;
}

/** Block edit/delete/upload on a single audit record when globally locked or completed. */
export function isUtilityAuditRecordEditsLocked(
  auditStepLocked?: boolean,
  recordCompleted?: boolean | AuditCompletenessRecord | null,
): boolean {
  const completed =
    typeof recordCompleted === "boolean" || recordCompleted === undefined
      ? Boolean(recordCompleted)
      : isAuditRecordMarkedCompleted(recordCompleted);
  return Boolean(auditStepLocked || completed);
}

/** Block sheet-level add/import when every record in the sheet is completed. */
export function isUtilityAuditSheetEditsLocked(
  auditStepLocked?: boolean,
  records?: AuditCompletenessRecord[] | null,
): boolean {
  if (auditStepLocked) return true;
  if (!records?.length) return false;
  return records.every((record) => isAuditRecordMarkedCompleted(record));
}

/**
 * Use on wrappers around edit toolbars (not read-only data) when the step or
 * facility audit is closed — replaces blur overlays with `hidden` edit chrome.
 */
export function cnHideUtilityAuditEdits(
  locked: boolean | undefined,
  ...rest: ClassValue[]
) {
  return cn(...rest, locked && "hidden");
}
