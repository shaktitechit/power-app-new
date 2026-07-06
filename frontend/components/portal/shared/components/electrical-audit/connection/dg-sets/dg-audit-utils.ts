import type { DGAuditRecord } from "@/store/slices/electrical-audit/dgAuditRecordApiSlice";

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function formatFilterCondition(value?: string) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getLatestDGAuditRecord(
  records: DGAuditRecord[],
): DGAuditRecord | null {
  if (!records.length) return null;

  return [...records].sort((a, b) => {
    const aTime = new Date(
      a.audit_date || a.created_at || a.createdAt || 0,
    ).getTime();
    const bTime = new Date(
      b.audit_date || b.created_at || b.createdAt || 0,
    ).getTime();
    return bTime - aTime;
  })[0];
}
