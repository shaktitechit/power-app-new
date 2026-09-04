import type { Enquiry } from "@/store/slices/enquiryApiSlice";
import { TERMINAL_ENQUIRY_STATUSES, pipelineStatusValue } from "./enquiryConstants";

export type FollowUpQueueTab =
  | "overdue"
  | "today"
  | "week"
  | "scheduled"
  | "none";

function startOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date = new Date()) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function isActivePipelineEnquiry(enquiry: Enquiry): boolean {
  return !TERMINAL_ENQUIRY_STATUSES.has(
    pipelineStatusValue(enquiry.enquiry_status ?? ""),
  );
}

export function followUpTimestamp(enquiry: Enquiry): number | null {
  if (!enquiry.next_followup_date) return null;
  const time = new Date(enquiry.next_followup_date).getTime();
  return Number.isNaN(time) ? null : time;
}

export function classifyFollowUpQueue(enquiry: Enquiry): FollowUpQueueTab {
  if (!enquiry.next_followup_date) return "none";
  const when = new Date(enquiry.next_followup_date);
  if (Number.isNaN(when.getTime())) return "none";

  const now = startOfDay();
  const todayEnd = endOfDay();
  const weekEnd = new Date(now);
  weekEnd.setDate(weekEnd.getDate() + 7);
  weekEnd.setHours(23, 59, 59, 999);

  if (when < now) return "overdue";
  if (when <= todayEnd) return "today";
  if (when <= weekEnd) return "week";
  return "scheduled";
}

export function matchesFollowUpQueueTab(
  enquiry: Enquiry,
  tab: FollowUpQueueTab,
): boolean {
  return classifyFollowUpQueue(enquiry) === tab;
}

export function countFollowUpQueues(enquiries: Enquiry[]) {
  const counts: Record<FollowUpQueueTab, number> = {
    overdue: 0,
    today: 0,
    week: 0,
    scheduled: 0,
    none: 0,
  };

  for (const row of enquiries) {
    if (!isActivePipelineEnquiry(row)) continue;
    counts[classifyFollowUpQueue(row)]++;
  }

  return counts;
}

export function sortByNextFollowUp(enquiries: Enquiry[]): Enquiry[] {
  return [...enquiries].sort((a, b) => {
    const left = followUpTimestamp(a);
    const right = followUpTimestamp(b);
    if (left == null && right == null) return 0;
    if (left == null) return 1;
    if (right == null) return -1;
    return left - right;
  });
}

export function followUpQueueEnquiries(
  enquiries: Enquiry[],
  tab: "today" | "overdue",
): Enquiry[] {
  return sortByNextFollowUp(
    enquiries.filter(
      (row) =>
        isActivePipelineEnquiry(row) && matchesFollowUpQueueTab(row, tab),
    ),
  );
}
