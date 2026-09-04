import { resolveUserId } from "@/components/portal/lib/enquiryAccess";
import {
  ENQUIRY_PIPELINE_STEPS,
  TERMINAL_ENQUIRY_STATUSES,
  enquiryStatusMatchesFilter,
  pipelineStatusValue,
} from "@/components/portal/lib/enquiryConstants";
import { enquirySearchHaystack } from "@/components/portal/lib/enquirySearchHaystack";
import type { Enquiry } from "@/store/slices/enquiryApiSlice";

export type EnquiryPipelineTab = "all" | (typeof ENQUIRY_PIPELINE_STEPS)[number]["key"];

export type EnquiryListFilters = {
  searchQuery: string;
  pipelineTab: EnquiryPipelineTab;
  filterAuditType: string;
  filterAssignedTo: string;
  filterAssignedManager: string;
  filterAssignedAdmin: string;
  filterFollowUpRange: string;
  filterFollowUpFrom: string;
  filterFollowUpTo: string;
  filterCreatedAtRange: string;
  filterCreatedAtFrom: string;
  filterCreatedAtTo: string;
};

export const DEFAULT_ENQUIRY_LIST_FILTERS: EnquiryListFilters = {
  searchQuery: "",
  pipelineTab: "all",
  filterAuditType: "all",
  filterAssignedTo: "all",
  filterAssignedManager: "all",
  filterAssignedAdmin: "all",
  filterFollowUpRange: "all",
  filterFollowUpFrom: "",
  filterFollowUpTo: "",
  filterCreatedAtRange: "all",
  filterCreatedAtFrom: "",
  filterCreatedAtTo: "",
};

export function matchesEnquiryPipelineTab(
  row: Enquiry,
  tab: EnquiryPipelineTab,
): boolean {
  if (tab === "all") return true;
  if (tab === "decision") {
    return TERMINAL_ENQUIRY_STATUSES.has(
      pipelineStatusValue(row.enquiry_status ?? ""),
    );
  }
  return enquiryStatusMatchesFilter(row.enquiry_status, tab);
}

export function checkEnquiryNextFollowUp(
  dateStr: string | undefined,
  range: string,
  fromDate?: string,
  toDate?: string,
) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dTime = d.getTime();

  if (range === "custom") {
    const start = fromDate ? new Date(fromDate) : null;
    const end = toDate ? new Date(toDate) : null;
    if (start) {
      start.setHours(0, 0, 0, 0);
      if (dTime < start.getTime()) return false;
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (dTime > end.getTime()) return false;
    }
    return true;
  }

  if (range === "today") {
    return d.toDateString() === new Date().toDateString();
  }
  if (range === "tomorrow") {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d.toDateString() === tomorrow.toDateString();
  }
  if (range === "this_week") {
    const next7 = new Date();
    next7.setDate(next7.getDate() + 7);
    return dTime >= now.getTime() && dTime <= next7.getTime();
  }
  if (range === "next_week") {
    const next14 = new Date();
    next14.setDate(next14.getDate() + 14);
    return dTime >= now.getTime() && dTime <= next14.getTime();
  }
  return true;
}

export function checkEnquiryCreatedAt(
  dateStr: string | undefined,
  range: string,
  fromDate?: string,
  toDate?: string,
) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const dTime = d.getTime();
  const now = new Date();

  if (range === "custom") {
    const start = fromDate ? new Date(fromDate) : null;
    const end = toDate ? new Date(toDate) : null;
    if (start) {
      start.setHours(0, 0, 0, 0);
      if (dTime < start.getTime()) return false;
    }
    if (end) {
      end.setHours(23, 59, 59, 999);
      if (dTime > end.getTime()) return false;
    }
    return true;
  }

  if (range === "today") {
    return d.toDateString() === now.toDateString();
  }
  if (range === "yesterday") {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return d.toDateString() === yesterday.toDateString();
  }
  if (range === "last_week") {
    const limit = new Date();
    limit.setDate(limit.getDate() - 7);
    return dTime >= limit.getTime() && dTime <= now.getTime();
  }
  if (range === "last_month") {
    const limit = new Date();
    limit.setDate(limit.getDate() - 30);
    return dTime >= limit.getTime() && dTime <= now.getTime();
  }
  if (range === "3_months") {
    const limit = new Date();
    limit.setDate(limit.getDate() - 90);
    return dTime >= limit.getTime() && dTime <= now.getTime();
  }
  return true;
}

export function countActiveEnquiryListFilters(filters: EnquiryListFilters) {
  let count = 0;
  if (filters.searchQuery.trim()) count++;
  if (filters.pipelineTab !== "all") count++;
  if (filters.filterAuditType !== "all") count++;
  if (filters.filterAssignedTo !== "all") count++;
  if (filters.filterAssignedManager !== "all") count++;
  if (filters.filterAssignedAdmin !== "all") count++;
  if (filters.filterFollowUpRange !== "all") {
    if (
      filters.filterFollowUpRange !== "custom" ||
      filters.filterFollowUpFrom ||
      filters.filterFollowUpTo
    ) {
      count++;
    }
  }
  if (filters.filterCreatedAtRange !== "all") {
    if (
      filters.filterCreatedAtRange !== "custom" ||
      filters.filterCreatedAtFrom ||
      filters.filterCreatedAtTo
    ) {
      count++;
    }
  }
  return count;
}

export function filterEnquiryList(
  enquiries: Enquiry[],
  filters: EnquiryListFilters,
): Enquiry[] {
  let list = enquiries;

  if (filters.pipelineTab !== "all") {
    list = list.filter((row) =>
      matchesEnquiryPipelineTab(row, filters.pipelineTab),
    );
  }

  const q = filters.searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter((row) => enquirySearchHaystack(row).includes(q));
  }

  if (filters.filterAuditType !== "all") {
    list = list.filter((row) =>
      row.requested_audit_types?.includes(
        filters.filterAuditType as NonNullable<Enquiry["requested_audit_types"]>[number],
      ),
    );
  }

  if (filters.filterAssignedTo !== "all") {
    list = list.filter(
      (row) => resolveUserId(row.assigned_to) === filters.filterAssignedTo,
    );
  }

  if (filters.filterAssignedManager !== "all") {
    list = list.filter(
      (row) =>
        resolveUserId(row.assigned_manager_to) === filters.filterAssignedManager,
    );
  }

  if (filters.filterAssignedAdmin !== "all") {
    list = list.filter(
      (row) =>
        resolveUserId(row.assigned_admin_to) === filters.filterAssignedAdmin,
    );
  }

  if (filters.filterFollowUpRange !== "all") {
    list = list.filter((row) =>
      checkEnquiryNextFollowUp(
        row.next_followup_date,
        filters.filterFollowUpRange,
        filters.filterFollowUpFrom,
        filters.filterFollowUpTo,
      ),
    );
  }

  if (filters.filterCreatedAtRange !== "all") {
    list = list.filter((row) =>
      checkEnquiryCreatedAt(
        row.created_at ||
          (row.created_by &&
          typeof row.created_by === "object" &&
          "created_at" in row.created_by
            ? String((row.created_by as { created_at?: string }).created_at ?? "")
            : undefined) ||
          undefined,
        filters.filterCreatedAtRange,
        filters.filterCreatedAtFrom,
        filters.filterCreatedAtTo,
      ),
    );
  }

  return list;
}
