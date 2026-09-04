import { type ClassValue } from "clsx";
import { cn } from "@/components/portal/lib/utils";

type AuditCompletenessRecord = {
  is_completed?: boolean | string | null;
};

/** Normalize API / form values so `"false"` is not treated as completed. */
export function isAuditRecordCompleted(
  value?: boolean | string | null,
): boolean {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }
  return false;
}

/** Block edit/delete/upload on a single audit record when globally locked or completed. */
export function isUtilityAuditRecordEditsLocked(
  auditStepLocked?: boolean,
  recordCompleted?: boolean | string | null,
): boolean {
  return Boolean(auditStepLocked || isAuditRecordCompleted(recordCompleted));
}

/** Block sheet-level add/import when every record in the sheet is completed. */
export function isUtilityAuditSheetEditsLocked(
  auditStepLocked?: boolean,
  records?: AuditCompletenessRecord[] | null,
): boolean {
  if (auditStepLocked) return true;
  if (!records?.length) return false;
  return records.every((record) => isAuditRecordCompleted(record.is_completed));
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
