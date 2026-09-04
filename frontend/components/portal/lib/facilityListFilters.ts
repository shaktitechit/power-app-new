import { getFacilityAuditors, isFacilityAuditClosed } from "@/components/portal/lib/facilityExport";
import type { Facility } from "@/store/slices/facilityApiSlice";

export type FacilityAuditTab = "all" | "open" | "closed";

export type FacilityListFilters = {
  auditTypeFilter: string;
  auditorFilter: string;
  startDateFrom: string;
  startDateTo: string;
  closureDateFrom: string;
  closureDateTo: string;
};

export const DEFAULT_FACILITY_LIST_FILTERS: FacilityListFilters = {
  auditTypeFilter: "all",
  auditorFilter: "all",
  startDateFrom: "",
  startDateTo: "",
  closureDateFrom: "",
  closureDateTo: "",
};

export function countActiveFacilityListFilters(filters: FacilityListFilters): number {
  let count = 0;
  if (filters.auditTypeFilter !== "all") count += 1;
  if (filters.auditorFilter !== "all") count += 1;
  if (filters.startDateFrom) count += 1;
  if (filters.startDateTo) count += 1;
  if (filters.closureDateFrom) count += 1;
  if (filters.closureDateTo) count += 1;
  return count;
}

export function filterFacilityList(
  facilities: Facility[],
  filters: FacilityListFilters,
): Facility[] {
  return facilities.filter((facility) => {
    if (
      filters.auditTypeFilter !== "all" &&
      facility.audit_type !== filters.auditTypeFilter
    ) {
      return false;
    }

    if (filters.auditorFilter !== "all") {
      const auditors = getFacilityAuditors(facility);
      const hasMatch = auditors.some((info) => info.key === filters.auditorFilter);
      if (!hasMatch) return false;
    }

    if (facility.start_date) {
      const startMs = new Date(facility.start_date).getTime();
      if (filters.startDateFrom && startMs < new Date(filters.startDateFrom).getTime()) {
        return false;
      }
      if (filters.startDateTo && startMs > new Date(filters.startDateTo).getTime()) {
        return false;
      }
    } else if (filters.startDateFrom || filters.startDateTo) {
      return false;
    }

    if (facility.closure_date) {
      const closureMs = new Date(facility.closure_date).getTime();
      if (
        filters.closureDateFrom &&
        closureMs < new Date(filters.closureDateFrom).getTime()
      ) {
        return false;
      }
      if (filters.closureDateTo && closureMs > new Date(filters.closureDateTo).getTime()) {
        return false;
      }
    } else if (filters.closureDateFrom || filters.closureDateTo) {
      return false;
    }

    return true;
  });
}

export function filterFacilitiesByAuditTab(
  facilities: Facility[],
  tab: FacilityAuditTab,
): Facility[] {
  if (tab === "open") {
    return facilities.filter((facility) => !isFacilityAuditClosed(facility));
  }
  if (tab === "closed") {
    return facilities.filter((facility) => isFacilityAuditClosed(facility));
  }
  return facilities;
}

export function deriveUniqueFacilityAuditors(facilities: Facility[]) {
  const list = new Set<string>();
  const mapping: Record<string, string> = {};

  facilities.forEach((facility) => {
    getFacilityAuditors(facility).forEach((info) => {
      if (info.key) {
        list.add(info.key);
        mapping[info.key] = info.name || info.email || "Auditor";
      }
    });
  });

  return Array.from(list).map((key) => ({
    key,
    name: mapping[key],
  }));
}
