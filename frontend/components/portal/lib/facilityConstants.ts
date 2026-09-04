import type { Facility } from "@/store/slices/facilityApiSlice";

/** Matches backend `facility.audit_type` enum. */
export const ELECTRICAL_SAFETY_AUDIT = "Electrical Safety Audit" as const;

export const AUDIT_TYPE_OPTIONS = [
  "Electrical Energy Audit",
  ELECTRICAL_SAFETY_AUDIT,
  "Thermal Audit",
  "Lightning Arrester Audit",
] as const;

export type AuditTypeOption = (typeof AUDIT_TYPE_OPTIONS)[number];

/** Display amount: stored expected_value, else tentative budget fallback. */
export function facilityExpectedValue(
  facility: Pick<Facility, "expected_value" | "budget">,
): number | null {
  if (facility.expected_value != null) return facility.expected_value;
  if (facility.budget?.tentative_budget != null) return facility.budget.tentative_budget;
  return null;
}
