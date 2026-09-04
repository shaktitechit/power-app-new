import type { ExpressionOfInterest } from "@/store/slices/eoiApiSlice";

export type EoiDashboardStats = {
  total: number;
  draft: number;
  sent: number;
  accepted: number;
};

export function eoiDashboardStats(eois: ExpressionOfInterest[]): EoiDashboardStats {
  return {
    total: eois.length,
    draft: eois.filter((row) => row.status === "DRAFT").length,
    sent: eois.filter((row) => row.status === "SENT").length,
    accepted: eois.filter((row) => row.status === "ACCEPTED").length,
  };
}

function eoiActivityTimestamp(eoi: ExpressionOfInterest): number {
  const raw = eoi.updated_at ?? eoi.created_at ?? eoi.eoiDate;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function recentEois(
  eois: ExpressionOfInterest[],
  limit = 5,
): ExpressionOfInterest[] {
  return [...eois]
    .sort((a, b) => eoiActivityTimestamp(b) - eoiActivityTimestamp(a))
    .slice(0, limit);
}
