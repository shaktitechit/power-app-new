import type { Quotation, QuotationStatus } from "@/store/slices/quotationApiSlice";
import { AUDIT_TYPE_OPTIONS } from "./facilityConstants";

export const QUOTATION_STATUS_OPTIONS: {
  value: QuotationStatus;
  label: string;
}[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "ACCEPTED", label: "Accepted" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function quotationStatusLabel(status: string): string {
  return (
    QUOTATION_STATUS_OPTIONS.find((option) => option.value === status)?.label ??
    status.replace(/_/g, " ")
  );
}

export function formatInr(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function formatDisplayDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN");
}

export function quotationEnquiryId(quotation: Quotation): string | undefined {
  const enquiry = quotation.enquiryId;
  if (!enquiry) return undefined;
  if (typeof enquiry === "string") return enquiry;
  return enquiry._id;
}

export function quotationEnquiryLabel(quotation: Quotation): string {
  const enquiry = quotation.enquiryId;
  if (enquiry && typeof enquiry === "object") {
    return enquiry.enquiry_number || enquiry.name || "—";
  }
  return quotation.reference || "—";
}

export function quotationCustomerName(quotation: Quotation): string {
  return quotation.customer?.name?.trim() || "—";
}

export const QUOTATION_STATUS_TRANSITIONS: Record<QuotationStatus, QuotationStatus[]> = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "DRAFT"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["DRAFT", "CANCELLED"],
  EXPIRED: ["DRAFT", "CANCELLED"],
  CANCELLED: ["DRAFT"],
};

export function canSendQuotationEmail(status: QuotationStatus) {
  return status === "DRAFT" || status === "SENT" || status === "ACCEPTED";
}

export function canEditQuotation(status: QuotationStatus) {
  return status !== "ACCEPTED" && status !== "REJECTED" && status !== "CANCELLED";
}

/** Audit type a quotation line item quotes, or `null` for anything else. */
export function matchQuotationAuditType(description?: string | null): string | null {
  const normalized = String(description || "").trim().toLowerCase();
  if (!normalized) return null;
  return (
    AUDIT_TYPE_OPTIONS.find((type) => type.toLowerCase() === normalized) ?? null
  );
}

/** Newest accepted quotation for an enquiry-linked list. */
export function latestAcceptedQuotation(
  quotations: Quotation[],
): Quotation | null {
  const accepted = quotations.filter((row) => row.status === "ACCEPTED");
  if (accepted.length === 0) return null;
  return [...accepted].sort((a, b) => {
    const left = new Date(
      a.quotationDate || a.updated_at || a.created_at || 0,
    ).getTime();
    const right = new Date(
      b.quotationDate || b.updated_at || b.created_at || 0,
    ).getTime();
    return right - left;
  })[0];
}

/** Quoted amount per audit type from a quotation's line items. */
export function quotationAuditAmounts(quotation: Quotation): Record<string, number> {
  const amounts: Record<string, number> = {};
  for (const item of quotation.items ?? []) {
    const auditType = matchQuotationAuditType(item.description);
    if (!auditType) continue;
    const value = Number(item.amount);
    amounts[auditType] =
      (amounts[auditType] || 0) + (Number.isFinite(value) ? value : 0);
  }
  return amounts;
}

/** Merge quotation line items into enquiry requested audits. */
export function enquiryRequestedAuditsFromQuotation(
  quotation: Quotation,
  existingAudits: { audit_type: string; expected_value?: number }[] = [],
) {
  const quoted = quotationAuditAmounts(quotation);
  const values = new Map<string, number>(
    existingAudits.map((row) => [
      row.audit_type,
      Number(row.expected_value) || 0,
    ]),
  );
  for (const [auditType, amount] of Object.entries(quoted)) {
    values.set(auditType, amount);
  }
  return AUDIT_TYPE_OPTIONS.filter((type) => values.has(type)).map(
    (audit_type) => ({
      audit_type,
      expected_value: values.get(audit_type),
    }),
  );
}

/** Won enquiry's chosen quotation, else newest accepted quotation. */
export function resolveAcceptedQuotationForEnquiry(
  quotations: Quotation[],
  acceptedQuotationId?: string | null,
): Quotation | null {
  if (acceptedQuotationId) {
    const match = quotations.find((row) => row._id === acceptedQuotationId);
    if (match?.status === "ACCEPTED") return match;
  }
  return latestAcceptedQuotation(quotations);
}

/** Audit types covered by quotation line items, in facility audit order. */
export function quotationAuditTypes(quotation: Quotation): string[] {
  const seen = new Set<string>();
  for (const item of quotation.items ?? []) {
    const auditType = matchQuotationAuditType(item.description);
    if (auditType) seen.add(auditType);
  }
  return AUDIT_TYPE_OPTIONS.filter((type) => seen.has(type));
}
