import type { Enquiry } from "@/store/slices/enquiryApiSlice";
import { assigneeLabel, resolveUserId } from "./enquiryAccess";
import {
  ENQUIRY_PIPELINE_STEPS,
  TERMINAL_ENQUIRY_STATUSES,
  enquiryStatusMatchesFilter,
  pipelineStatusValue,
} from "./enquiryConstants";

export type AssigneeField =
  | "assigned_to"
  | "assigned_manager_to"
  | "assigned_admin_to";

export type AssigneeAnalyticsRow = {
  assignee: string;
  count: number;
  active: number;
  won: number;
  other: number;
  value: number;
};

export type AssigneeChartRow = {
  assignee: string;
  Active: number;
  Won: number;
  Other: number;
  value: number;
};

export function sumExpectedValue(enquiries: Enquiry[]): number {
  return enquiries.reduce(
    (total, row) => total + (Number(row.expected_value) || 0),
    0,
  );
}

export function countByPipelineStep(enquiries: Enquiry[]) {
  const counts: Record<string, number> = {
    new: 0,
    assigned: 0,
    follow_up: 0,
    eoi_sent: 0,
    quoted: 0,
    decision: 0,
  };

  for (const row of enquiries) {
    const canonical = pipelineStatusValue(row.enquiry_status ?? "");
    if (TERMINAL_ENQUIRY_STATUSES.has(canonical)) {
      counts.decision++;
      continue;
    }
    for (const step of ENQUIRY_PIPELINE_STEPS) {
      if (step.key === "decision") continue;
      if (enquiryStatusMatchesFilter(row.enquiry_status, step.key)) {
        counts[step.key]++;
        break;
      }
    }
  }

  return counts;
}

export function pipelineChartData(enquiries: Enquiry[]) {
  const counts = countByPipelineStep(enquiries);
  return ENQUIRY_PIPELINE_STEPS.map((step) => ({
    stage: step.label,
    count: counts[step.key] ?? 0,
  }));
}

export function outcomeChartData(enquiries: Enquiry[]) {
  const won = enquiries.filter(
    (row) => pipelineStatusValue(row.enquiry_status ?? "") === "won",
  ).length;
  const lost = enquiries.filter(
    (row) => pipelineStatusValue(row.enquiry_status ?? "") === "lost",
  ).length;
  const dropped = enquiries.filter(
    (row) => pipelineStatusValue(row.enquiry_status ?? "") === "dropped",
  ).length;

  return [
    { name: "Won", value: won },
    { name: "Lost", value: lost },
    { name: "Dropped", value: dropped },
  ].filter((row) => row.value > 0);
}

export function activePipelineEnquiries(enquiries: Enquiry[]): Enquiry[] {
  return enquiries.filter(
    (row) =>
      !TERMINAL_ENQUIRY_STATUSES.has(
        pipelineStatusValue(row.enquiry_status ?? ""),
      ),
  );
}

export function assigneeAnalyticsData(
  enquiries: Enquiry[],
  field: AssigneeField,
): AssigneeAnalyticsRow[] {
  const buckets = new Map<string, { label: string; rows: Enquiry[] }>();

  for (const row of enquiries) {
    const ref = row[field];
    const id = resolveUserId(ref) ?? "__unassigned__";
    const label = assigneeLabel(ref) ?? "Unassigned";
    const bucket = buckets.get(id);
    if (bucket) {
      bucket.rows.push(row);
    } else {
      buckets.set(id, { label, rows: [row] });
    }
  }

  const result: AssigneeAnalyticsRow[] = [];
  for (const { label, rows } of buckets.values()) {
    const activeRows = activePipelineEnquiries(rows);
    const wonRows = rows.filter(
      (row) => pipelineStatusValue(row.enquiry_status ?? "") === "won",
    );
    const active = activeRows.length;
    const won = wonRows.length;
    result.push({
      assignee: label,
      count: rows.length,
      active,
      won,
      other: Math.max(rows.length - active - won, 0),
      value: sumExpectedValue(rows),
    });
  }

  return result.sort((a, b) => b.count - a.count || a.assignee.localeCompare(b.assignee));
}

export function assigneeChartData(
  enquiries: Enquiry[],
  field: AssigneeField,
): AssigneeChartRow[] {
  return assigneeAnalyticsData(enquiries, field).map((row) => ({
    assignee: row.assignee,
    Active: row.active,
    Won: row.won,
    Other: row.other,
    value: row.value,
  }));
}
