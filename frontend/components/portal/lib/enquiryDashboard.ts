import type { Enquiry } from "@/store/slices/enquiryApiSlice";
import {
  activePipelineEnquiries,
  sumExpectedValue,
} from "@/components/portal/lib/enquiryAnalytics";
import { pipelineStatusValue } from "@/components/portal/lib/enquiryConstants";

export type EnquiryDashboardStats = {
  total: number;
  active: number;
  won: number;
  pipelineValue: number;
};

export function enquiryDashboardStats(enquiries: Enquiry[]): EnquiryDashboardStats {
  const active = activePipelineEnquiries(enquiries);
  const won = enquiries.filter(
    (row) => pipelineStatusValue(row.enquiry_status ?? "") === "won",
  );

  return {
    total: enquiries.length,
    active: active.length,
    won: won.length,
    pipelineValue: sumExpectedValue(active),
  };
}

function enquiryActivityTimestamp(enquiry: Enquiry): number {
  const raw =
    enquiry.updated_at ??
    enquiry.created_at ??
    enquiry.next_followup_date;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function recentEnquiries(enquiries: Enquiry[], limit = 5): Enquiry[] {
  return [...enquiries]
    .sort((a, b) => enquiryActivityTimestamp(b) - enquiryActivityTimestamp(a))
    .slice(0, limit);
}
