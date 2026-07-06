import type { AuditTypeOption } from "@/components/portal/lib/facilityConstants";
import { ELECTRICAL_SAFETY_AUDIT } from "@/components/portal/lib/facilityConstants";
import { ELECTRICAL_ENERGY_REPORT_TYPE_LABELS } from "@/components/portal/lib/reports/electricalEnergyReportTypes";
import { ELECTRICAL_SAFETY_AUDIT_REPORT_TYPE_LABELS } from "@/components/portal/lib/reports/electricalSafetyAuditReportTypes";

/** Display label for the only report type users can queue — matches backend generation policy. */
export function labelForFullAuditGeneration(
  auditType: AuditTypeOption,
): string {
  switch (auditType) {
    case ELECTRICAL_SAFETY_AUDIT:
      return ELECTRICAL_SAFETY_AUDIT_REPORT_TYPE_LABELS.full_audit_report;
    case "Electrical Energy Audit":
      return ELECTRICAL_ENERGY_REPORT_TYPE_LABELS.full_audit_report;
    default:
      return "Full audit report";
  }
}
