import type { Quotation } from "@/store/slices/quotationApiSlice";

export type QuotationDashboardStats = {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
};

export function quotationDashboardStats(
  quotations: Quotation[],
): QuotationDashboardStats {
  return {
    total: quotations.length,
    draft: quotations.filter((row) => row.status === "DRAFT").length,
    sent: quotations.filter((row) => row.status === "SENT").length,
    accepted: quotations.filter((row) => row.status === "ACCEPTED").length,
  };
}

function quotationActivityTimestamp(quotation: Quotation): number {
  const raw =
    quotation.updated_at ??
    quotation.created_at ??
    quotation.quotationDate;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function recentQuotations(
  quotations: Quotation[],
  limit = 5,
): Quotation[] {
  return [...quotations]
    .sort(
      (a, b) =>
        quotationActivityTimestamp(b) - quotationActivityTimestamp(a),
    )
    .slice(0, limit);
}
