"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { DataTable, Column } from "@/components/portal/ui/data-table";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/portal/ui/alert-dialog";
import { EnquiryStatusPill } from "@/components/portal/shared/components/enquiry/enquiry-status-pill";
import { enquirySearchHaystack } from "@/components/portal/lib/enquirySearchHaystack";
import { resolveUserId } from "@/components/portal/lib/enquiryAccess";
import { REQUESTED_AUDIT_TYPE_OPTIONS } from "@/components/portal/lib/enquiryConstants";
import {
  Search,
  MessageSquare,
  ArrowLeft,
  Pencil,
  Building2,
  Ban,
  FilterX,
  Trophy,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { Label } from "@/components/portal/ui/label";
import { Card } from "@/components/portal/ui/card";
import { useAssignableUsersQuery } from "@/store/slices/userApiSlice";
import {
  type Enquiry,
  useGetEnquiriesQuery,
  useUpdateEnquiryMutation,
} from "@/store/slices/enquiryApiSlice";
import {
  type Facility,
  useGetFacilitiesQuery,
} from "@/store/slices/facilityApiSlice";
import { useAppSelector } from "@/store/hooks";
import { CreateFacilityForm } from "@/components/portal/shared/components/facility/create-facility-form";
import { EditFacilityForm } from "@/components/portal/shared/components/facility/edit-facility-form";
import { formatInr, formatDisplayDate } from "@/components/portal/lib/quotationConstants";
import { facilityExpectedValue } from "@/components/portal/lib/facilityConstants";

const PAGE_SIZE = 10;
const LATEST_WON_COUNT = 5;

type FacilityFilter = "all" | "created" | "pending";
type WonDateRange = "all" | "today" | "last_week" | "last_month" | "custom";
type WonSortOrder = "latest" | "oldest";

function wonAtTimestamp(enquiry: Enquiry): number {
  const raw = enquiry.updated_at ?? enquiry.created_at;
  if (!raw) return 0;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function checkWonDate(
  enquiry: Enquiry,
  range: WonDateRange,
  fromDate?: string,
  toDate?: string,
): boolean {
  const raw = enquiry.updated_at ?? enquiry.created_at;
  if (!raw) return range === "all";
  const d = new Date(raw);
  const dTime = d.getTime();
  const now = new Date();
  now.setHours(0, 0, 0, 0);

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
  if (range === "last_week") {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    start.setHours(0, 0, 0, 0);
    return dTime >= start.getTime();
  }
  if (range === "last_month") {
    const start = new Date();
    start.setDate(start.getDate() - 30);
    start.setHours(0, 0, 0, 0);
    return dTime >= start.getTime();
  }
  return true;
}

function convertedFacilityId(e: Enquiry): string | null {
  const c = e.converted_facility_id;
  if (c == null || c === "") return null;
  if (typeof c === "object" && c !== null && "_id" in c && Boolean(c._id)) {
    return String(c._id);
  }
  return String(c);
}

function linkedFacilitiesForEnquiry(
  enquiry: Enquiry,
  facilities: Facility[],
  facilitiesByEnquiryNumber: Map<string, Facility[]>,
): Facility[] {
  const enquiryNumber = enquiry.enquiry_number?.trim();
  if (enquiryNumber) {
    const matched = facilitiesByEnquiryNumber.get(enquiryNumber) ?? [];
    if (matched.length > 0) {
      return [...matched].sort((a, b) =>
        (a.audit_type ?? "").localeCompare(b.audit_type ?? ""),
      );
    }
  }

  const primaryId = convertedFacilityId(enquiry);
  if (!primaryId) return [];
  const primary = facilities.find((f) => f._id === primaryId);
  return primary ? [primary] : [];
}

function isFacilityLinked(enquiry: Enquiry, linkedFacilities: Facility[]): boolean {
  return (
    linkedFacilities.length > 0 ||
    Boolean(enquiry.is_converted_to_facility && convertedFacilityId(enquiry))
  );
}

export default function SubmittedEnquiriesPage() {
  const router = useRouter();
  const user = useAppSelector((s) => s.auth.user);
  const isSuperAdmin = user?.role === "super_admin";

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [filterFacility, setFilterFacility] = useState<FacilityFilter>("all");
  const [filterAuditType, setFilterAuditType] = useState("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState("all");
  const [filterWonRange, setFilterWonRange] = useState<WonDateRange>("all");
  const [filterWonFrom, setFilterWonFrom] = useState("");
  const [filterWonTo, setFilterWonTo] = useState("");
  const [sortOrder, setSortOrder] = useState<WonSortOrder>("latest");

  const [facilitySourceEnquiry, setFacilitySourceEnquiry] =
    useState<Enquiry | null>(null);
  const [createFacilityOpen, setCreateFacilityOpen] = useState(false);
  const [editFacilityOpen, setEditFacilityOpen] = useState(false);
  const [editFacilityId, setEditFacilityId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Enquiry | null>(null);

  const [rejectSubmission, { isLoading: isRejecting }] =
    useUpdateEnquiryMutation();

  useEffect(() => {
    if (user != null && !isSuperAdmin) {
      router.replace("/dashboard");
    }
  }, [user, isSuperAdmin, router]);

  const {
    data,
    isLoading: enquiriesLoading,
    refetch: refetchEnquiries,
  } = useGetEnquiriesQuery(
    { enquiry_status: "won" },
    { skip: !isSuperAdmin },
  );

  const {
    data: facilitiesData,
    refetch: refetchFacilities,
  } = useGetFacilitiesQuery(undefined, { skip: !isSuperAdmin });

  const { data: assignableUsersRes } = useAssignableUsersQuery(undefined, {
    skip: !isSuperAdmin,
  });
  const assignableAuditors = useMemo(
    () => (assignableUsersRes?.data ?? []).filter((u) => u.role === "auditor"),
    [assignableUsersRes?.data],
  );

  const enquiries = data?.data ?? [];
  const facilities = facilitiesData?.data ?? [];

  const facilitiesByEnquiryNumber = useMemo(() => {
    const map = new Map<string, Facility[]>();
    for (const facility of facilities) {
      const key = facility.enquiry_number?.trim();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(facility);
      map.set(key, list);
    }
    return map;
  }, [facilities]);

  const refetch = async () => {
    await Promise.all([refetchEnquiries(), refetchFacilities()]);
  };

  const sortedEnquiries = useMemo(() => {
    return [...enquiries].sort((a, b) => {
      const delta = wonAtTimestamp(b) - wonAtTimestamp(a);
      return sortOrder === "latest" ? delta : -delta;
    });
  }, [enquiries, sortOrder]);

  const latestWonEnquiries = useMemo(
    () => sortedEnquiries.slice(0, LATEST_WON_COUNT),
    [sortedEnquiries],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterFacility !== "all") count++;
    if (filterAuditType !== "all") count++;
    if (filterAssignedTo !== "all") count++;
    if (filterWonRange !== "all") {
      if (filterWonRange !== "custom" || filterWonFrom || filterWonTo) count++;
    }
    if (sortOrder !== "latest") count++;
    return count;
  }, [
    filterFacility,
    filterAuditType,
    filterAssignedTo,
    filterWonRange,
    filterWonFrom,
    filterWonTo,
    sortOrder,
  ]);

  const clearFilters = () => {
    setFilterFacility("all");
    setFilterAuditType("all");
    setFilterAssignedTo("all");
    setFilterWonRange("all");
    setFilterWonFrom("");
    setFilterWonTo("");
    setSortOrder("latest");
  };

  const filtered = useMemo(() => {
    let list = sortedEnquiries;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((row) => enquirySearchHaystack(row).includes(q));
    }

    if (filterAuditType !== "all") {
      list = list.filter((row) =>
        row.requested_audit_types?.includes(filterAuditType as Enquiry["requested_audit_types"][number]),
      );
    }

    if (filterAssignedTo !== "all") {
      list = list.filter(
        (row) => resolveUserId(row.assigned_to) === filterAssignedTo,
      );
    }

    if (filterFacility !== "all") {
      list = list.filter((row) => {
        const linkedFacilities = linkedFacilitiesForEnquiry(
          row,
          facilities,
          facilitiesByEnquiryNumber,
        );
        const linked = isFacilityLinked(row, linkedFacilities);
        return filterFacility === "created" ? linked : !linked;
      });
    }

    if (filterWonRange !== "all") {
      list = list.filter((row) =>
        checkWonDate(row, filterWonRange, filterWonFrom, filterWonTo),
      );
    }

    return list;
  }, [
    sortedEnquiries,
    searchQuery,
    filterAuditType,
    filterAssignedTo,
    filterFacility,
    filterWonRange,
    filterWonFrom,
    filterWonTo,
    facilities,
    facilitiesByEnquiryNumber,
  ]);

  const totalFiltered = filtered.length;
  const totalPages =
    totalFiltered === 0 ? 1 : Math.ceil(totalFiltered / PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    filterFacility,
    filterAuditType,
    filterAssignedTo,
    filterWonRange,
    filterWonFrom,
    filterWonTo,
    sortOrder,
  ]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const confirmRejectSubmission = async () => {
    if (!rejectTarget?._id || rejectTarget.enquiry_status !== "won") return;
    const linked = linkedFacilitiesForEnquiry(
      rejectTarget,
      facilities,
      facilitiesByEnquiryNumber,
    );
    if (isFacilityLinked(rejectTarget, linked)) return;
    try {
      await rejectSubmission({
        id: rejectTarget._id,
        enquiry_status: "lost",
      }).unwrap();
      setRejectDialogOpen(false);
      setRejectTarget(null);
      await refetch();
    } catch (error) {
      console.error("Failed to reject submission:", error);
    }
  };

  const columns: Column<Enquiry>[] = [
    {
      key: "name",
      header: "Enquiry",
      render: (row) => (
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:h-10 sm:w-10">
            <MessageSquare className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground sm:text-base">
              {row.name}
            </p>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {row.city}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "enquiry_status",
      header: "Status",
      render: (row) => <EnquiryStatusPill status={row.enquiry_status} />,
    },
    {
      key: "assigned_to",
      header: "Assigned",
      hideOnMobile: true,
      render: (row) => {
        const a = row.assigned_to;
        if (!a) return <span className="text-muted-foreground">—</span>;
        if (typeof a === "object")
          return (
            <span className="text-foreground">{a.name ?? a.email ?? "—"}</span>
          );
        return <span className="font-mono text-xs">{String(a)}</span>;
      },
    },
    {
      key: "requested_audits",
      header: "Requested audits",
      hideOnMobile: true,
      render: (row) => {
        const types = row.requested_audit_types ?? [];
        if (types.length === 0) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex max-w-xs flex-wrap gap-1.5">
            {types.map((auditType) => {
              const amount = row.requested_audits?.find(
                (entry) => entry.audit_type === auditType,
              )?.expected_value;
              return (
                <span
                  key={auditType}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium"
                >
                  <span className="max-w-[9rem] truncate">{auditType}</span>
                  {amount != null ? (
                    <span className="shrink-0 font-semibold text-primary">
                      {formatInr(amount)}
                    </span>
                  ) : null}
                </span>
              );
            })}
          </div>
        );
      },
    },
    {
      key: "won_on",
      header: "Won on",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {formatDisplayDate(row.updated_at ?? row.created_at)}
        </span>
      ),
    },
    {
      key: "expected_value",
      header: "Total value",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm font-medium text-foreground">
          {row.expected_value != null ? formatInr(row.expected_value) : "—"}
        </span>
      ),
    },
    {
      key: "next_followup_date",
      header: "Next follow-up",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {row.next_followup_date
            ? new Date(row.next_followup_date).toLocaleDateString()
            : "—"}
        </span>
      ),
    },
    {
      key: "converted",
      header: "Facilities",
      hideOnMobile: true,
      render: (row) => {
        const linkedFacilities = linkedFacilitiesForEnquiry(
          row,
          facilities,
          facilitiesByEnquiryNumber,
        );
        const linked = isFacilityLinked(row, linkedFacilities);

        return (
          <div className="space-y-2">
            <p className="text-sm">
              {linked ? (
                <span className="text-emerald-700 dark:text-emerald-400">
                  {linkedFacilities.length > 1
                    ? `${linkedFacilities.length} facilities`
                    : "Linked"}
                </span>
              ) : (
                <span className="text-muted-foreground">Not created</span>
              )}
            </p>

            {linkedFacilities.length > 0 ? (
              <div className="flex max-w-xs flex-wrap gap-1.5">
                {linkedFacilities.map((facility) => {
                  const expectedValue = facilityExpectedValue(facility);
                  return (
                    <span
                      key={facility._id}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs font-medium"
                    >
                      <span className="max-w-[9rem] truncate">
                        {facility.audit_type ?? "Facility"}
                      </span>
                      {expectedValue != null ? (
                        <span className="shrink-0 font-semibold text-primary">
                          {formatInr(expectedValue)}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            ) : null}

            <div
              className="flex flex-wrap gap-1.5"
              onClick={(e) => e.stopPropagation()}
            >
              {linked ? (
                linkedFacilities.map((facility) => (
                  <Button
                    key={facility._id}
                    variant="outline"
                    size="sm"
                    className="h-8"
                    title={facility.audit_type ?? "Edit facility"}
                    onClick={() => {
                      setEditFacilityId(facility._id);
                      setEditFacilityOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" />
                    {linkedFacilities.length > 1
                      ? facility.audit_type?.split(" ")[0] ?? "Edit"
                      : "Edit"}
                  </Button>
                ))
              ) : (
                <Button
                  size="sm"
                  className="h-8"
                  onClick={() => {
                    setFacilitySourceEnquiry(row);
                    setCreateFacilityOpen(true);
                  }}
                >
                  <Building2 className="mr-1 h-3.5 w-3.5" />
                  Create
                </Button>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => {
        const linkedFacilities = linkedFacilitiesForEnquiry(
          row,
          facilities,
          facilitiesByEnquiryNumber,
        );
        const linked = isFacilityLinked(row, linkedFacilities);
        const rejectBlocked = linked || row.enquiry_status !== "won";
        const rejectTitle = linked
          ? "Reject is not available when a facility is linked."
          : row.enquiry_status !== "won"
            ? undefined
            : "Reject — marks lost and removes from submitted list.";
        return (
          <div
            className="flex flex-wrap gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={rejectBlocked || isRejecting}
              title={rejectTitle}
              onClick={() => {
                setRejectTarget(row);
                setRejectDialogOpen(true);
              }}
            >
              <Ban className="mr-1 h-3.5 w-3.5" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const SubmittedTable = DataTable as any;

  if (user === null) {
    return (
      <DashboardLayout
        title="Submitted enquiries"
        subtitle="Leads marked as won from the pipeline"
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </DashboardLayout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <DashboardLayout
        title="Submitted enquiries"
        subtitle="Leads marked as won from the pipeline"
      >
        <p className="text-sm text-muted-foreground">
          This page is restricted to super administrators.
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Submitted enquiries"
      subtitle="Leads marked as won from the pipeline"
    >
      <div className="mb-4 sm:mb-6">
        <Button variant="ghost" size="sm" className="w-fit px-0" asChild>
          <Link href="/enquiries" className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            All enquiries
          </Link>
        </Button>
      </div>

      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 w-full flex-1 sm:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search submitted enquiries…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-input pl-9"
          />
        </div>
      </div>

      {latestWonEnquiries.length > 0 ? (
        <div className="mb-4 space-y-3 sm:mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Latest won</h2>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {latestWonEnquiries.map((row, index) => {
              const linkedFacilities = linkedFacilitiesForEnquiry(
                row,
                facilities,
                facilitiesByEnquiryNumber,
              );
              const linked = isFacilityLinked(row, linkedFacilities);
              return (
                <Card
                  key={row._id}
                  className="cursor-pointer border-border bg-card py-0 transition-colors hover:border-primary/40 hover:bg-muted/30"
                  onClick={() => router.push(`/enquiries/${row._id}`)}
                >
                  <div className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {row.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {row.city}
                        </p>
                      </div>
                      {index === 0 && sortOrder === "latest" ? (
                        <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          Latest
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDisplayDate(row.updated_at ?? row.created_at)}</span>
                      <span>·</span>
                      <span className="font-medium text-foreground">
                        {row.expected_value != null
                          ? formatInr(row.expected_value)
                          : "—"}
                      </span>
                    </div>
                    <p className="text-xs">
                      {linked ? (
                        <span className="text-emerald-700 dark:text-emerald-400">
                          {linkedFacilities.length > 1
                            ? `${linkedFacilities.length} facilities linked`
                            : "Facility linked"}
                        </span>
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400">
                          Facility pending
                        </span>
                      )}
                    </p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="mb-4 rounded-lg border border-border bg-muted/10 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Facility status
            </Label>
            <Select
              value={filterFacility}
              onValueChange={(value) => setFilterFacility(value as FacilityFilter)}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All submissions</SelectItem>
                <SelectItem value="created">Facilities created</SelectItem>
                <SelectItem value="pending">Facility pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Audit type
            </Label>
            <Select value={filterAuditType} onValueChange={setFilterAuditType}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All audit types</SelectItem>
                {REQUESTED_AUDIT_TYPE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned auditor
            </Label>
            <Select value={filterAssignedTo} onValueChange={setFilterAssignedTo}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All auditors</SelectItem>
                {assignableAuditors.map((user) => (
                  <SelectItem key={user._id} value={user._id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Won date
            </Label>
            <Select
              value={filterWonRange}
              onValueChange={(value) => setFilterWonRange(value as WonDateRange)}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All time</SelectItem>
                <SelectItem value="today">Won today</SelectItem>
                <SelectItem value="last_week">Last 7 days</SelectItem>
                <SelectItem value="last_month">Last 30 days</SelectItem>
                <SelectItem value="custom">Custom range…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sort by won
            </Label>
            <Select
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as WonSortOrder)}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">Latest won first</SelectItem>
                <SelectItem value="oldest">Oldest won first</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filterWonRange === "custom" ? (
          <div className="mt-3 grid max-w-md grid-cols-2 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Won from</Label>
              <Input
                type="date"
                value={filterWonFrom}
                onChange={(e) => setFilterWonFrom(e.target.value)}
                className="mt-1 h-9 bg-background text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Won to</Label>
              <Input
                type="date"
                value={filterWonTo}
                onChange={(e) => setFilterWonTo(e.target.value)}
                className="mt-1 h-9 bg-background text-xs"
              />
            </div>
          </div>
        ) : null}

        {activeFilterCount > 0 ? (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-muted-foreground"
              onClick={clearFilters}
            >
              <FilterX className="mr-1.5 h-3.5 w-3.5" />
              Clear filters ({activeFilterCount})
            </Button>
          </div>
        ) : null}
      </div>

      <SubmittedTable
        columns={columns}
        data={paginated}
        loading={enquiriesLoading}
        onRowClick={(row?: Enquiry) => row && router.push(`/enquiries/${row._id}`)}
        emptyMessage="No submitted enquiries yet"
      />

      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {totalFiltered === 0 ? (
            <>
              {enquiries.length === 0
                ? "Nothing submitted yet."
                : "No results match your search or filters."}
            </>
          ) : (
            <>
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered}{" "}
              enquiries
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || enquiriesLoading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="tabular-nums text-xs text-muted-foreground sm:text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={
              page >= totalPages ||
              enquiriesLoading ||
              totalFiltered === 0
            }
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      <CreateFacilityForm
        open={createFacilityOpen}
        fromEnquiry={facilitySourceEnquiry}
        onOpenChange={(open) => {
          setCreateFacilityOpen(open);
          if (!open) setFacilitySourceEnquiry(null);
        }}
        onComplete={() => void refetch()}
      />

      <EditFacilityForm
        open={editFacilityOpen}
        onOpenChange={(open) => {
          setEditFacilityOpen(open);
          if (!open) setEditFacilityId(null);
        }}
        onComplete={() => void refetch()}
        facilityId={editFacilityId}
      />

      <AlertDialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) setRejectTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject submission?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark{" "}
              <strong>{rejectTarget?.name ?? "this enquiry"}</strong> as{" "}
              <strong>lost</strong> and remove it from submitted enquiries.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRejecting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isRejecting ||
                !rejectTarget?._id ||
                rejectTarget.enquiry_status !== "won" ||
                (rejectTarget != null &&
                  isFacilityLinked(
                    rejectTarget,
                    linkedFacilitiesForEnquiry(
                      rejectTarget,
                      facilities,
                      facilitiesByEnquiryNumber,
                    ),
                  ))
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => void confirmRejectSubmission()}
            >
              {isRejecting ? "Rejecting…" : "Reject submission"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
