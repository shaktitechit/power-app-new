import { hasUtilityFinalAuditSubmission } from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { isDataSheetSectionIncluded } from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { ALL_DATASHEET_SECTIONS } from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";

export const UTILITY_ACCOUNTS_PAGE_SIZE = 10;

export type UtilityAccountStatusFilter = "all" | "completed" | "pending";

export function isUtilityAccountAuditComplete(account: UtilityAccount): boolean {
  return hasUtilityFinalAuditSubmission(
    account.audit_step_submissions,
    account,
  );
}

export function matchesUtilityAccountStatusFilter(
  account: UtilityAccount,
  filter: UtilityAccountStatusFilter,
): boolean {
  if (filter === "all") return true;
  const completed = isUtilityAccountAuditComplete(account);
  return filter === "completed" ? completed : !completed;
}

export function formatAuditClosureUser(
  ref:
    | string
    | { _id?: string; name?: string; email?: string }
    | null
    | undefined,
): string {
  if (ref == null || ref === "") return "-";
  if (typeof ref === "object") {
    return ref.name || ref.email || ref._id || "-";
  }
  return String(ref);
}

export function utilityAccountSearchHaystack(account: UtilityAccount): string {
  const facilityIdPart =
    typeof account.facility_id === "string"
      ? account.facility_id
      : [
          account.facility_id?._id,
          account.facility_id?.name,
          account.facility_id?.city,
        ]
          .filter(Boolean)
          .join(" ");

  const flagBits = [
    ...ALL_DATASHEET_SECTIONS.filter((section) =>
      isDataSheetSectionIncluded(account.dataSheet, section.key),
    ).flatMap((section) => [section.key, section.label.toLowerCase()]),
    account.is_transformer_maintained_by_facility
      ? "transformer maintained facility"
      : "",
  ];

  const docBits = (account.documents ?? []).flatMap((d) =>
    [d.fileName, d.fileUrl, d.uploadedAt].filter(Boolean),
  );

  const submissionsJson = account.audit_step_submissions
    ? JSON.stringify(account.audit_step_submissions)
    : "";

  const demand =
    account.sanctioned_demand_value != null
      ? `${account.sanctioned_demand_value} ${account.sanctioned_demand_unit || "kVA"}`
      : account.sanctioned_demand_kVA != null
        ? `${account.sanctioned_demand_kVA} kVA`
        : "";

  const auditWords = hasUtilityFinalAuditSubmission(
    account.audit_step_submissions,
    account,
  )
    ? "completed done"
    : "pending";

  const parts = [
    account._id,
    account.account_number,
    account.connection_type,
    account.category,
    account.location,
    demand,
    demand ? "kva kv" : "",
    account.provider,
    account.billing_cycle,
    account.audit_date,
    account.auditor_id,
    account.created_at,
    account.updated_at,
    account.createdAt,
    account.updatedAt,
    facilityIdPart,
    ...flagBits,
    ...docBits,
    submissionsJson,
    auditWords,
  ];

  return parts.filter(Boolean).join(" ").toLowerCase();
}
