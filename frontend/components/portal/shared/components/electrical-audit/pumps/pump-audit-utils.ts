import type { PumpAuditRecord } from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function formatPumpCondition(value?: string) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function getLatestPumpAuditRecord(
  records: PumpAuditRecord[],
): PumpAuditRecord | null {
  if (!records || records.length === 0) return null;
  const sorted = [...records].sort((a, b) => {
    const da = Date.parse(a.audit_date || a.created_at || "");
    const db = Date.parse(b.audit_date || b.created_at || "");
    if (!Number.isNaN(da) && !Number.isNaN(db)) {
      return db - da;
    }
    return String(b._id).localeCompare(String(a._id));
  });
  return sorted[0];
}
