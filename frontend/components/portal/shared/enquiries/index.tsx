"use client";

import { canEditEnquiry } from "@/components/portal/lib/enquiryAccess";
import { EnquiryStatusPill } from "@/components/portal/shared/components/enquiry/enquiry-status-pill";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import * as XLSX from "xlsx";
import { CreateEnquiryForm } from "@/components/portal/shared/components/enquiry/create-enquiry-form";
import { EditEnquiryForm } from "@/components/portal/shared/components/enquiry/edit-enquiry-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/portal/ui/dialog";
import { Plus, Search, MessageSquare, FileSpreadsheet, Download, FilterX } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { Label } from "@/components/portal/ui/label";
import { useAssignableUsersQuery } from "@/store/slices/userApiSlice";
import {
  ENQUIRY_STATUS_OPTIONS,
  REQUESTED_AUDIT_TYPE_OPTIONS,
} from "@/components/portal/lib/enquiryConstants";
import {
  type Enquiry,
  useGetEnquiriesQuery,
  useDeleteEnquiryMutation,
} from "@/store/slices/enquiryApiSlice";
import { useAppSelector } from "@/store/hooks";
import { enquirySearchHaystack } from "@/components/portal/lib/enquirySearchHaystack";

const PAGE_SIZE = 10;

function checkNextFollowUp(dateStr: string | undefined, range: string, fromDate?: string, toDate?: string) {
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
    const today = new Date();
    return d.toDateString() === today.toDateString();
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

function checkCreatedAt(dateStr: string | undefined, range: string, fromDate?: string, toDate?: string) {
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

export default function EnquiriesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(
    null,
  );
  const [filterAuditType, setFilterAuditType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState("all");
  const [filterAssignedAdmin, setFilterAssignedAdmin] = useState("all");
  const [filterFollowUpRange, setFilterFollowUpRange] = useState("today");
  const [filterFollowUpFrom, setFilterFollowUpFrom] = useState("");
  const [filterFollowUpTo, setFilterFollowUpTo] = useState("");
  const [filterCreatedAtRange, setFilterCreatedAtRange] = useState("all");
  const [filterCreatedAtFrom, setFilterCreatedAtFrom] = useState("");
  const [filterCreatedAtTo, setFilterCreatedAtTo] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);


  const user = useAppSelector((state) => state.auth.user);
  const userId = user?._id?.toString();

  const canCreateEnquiry = Boolean(user);

  const {
    data,
    isLoading: enquiriesLoading,
    refetch: refetchEnquiries,
  } = useGetEnquiriesQuery();

  const { data: assignableRes } = useAssignableUsersQuery();
  const assignableUsers = assignableRes?.data ?? [];
  const assignableAuditorsAndManagers = useMemo(() => {
    return assignableUsers.filter((u) => u.role === "auditor" || u.role === "manager");
  }, [assignableUsers]);
  const assignableAdmins = useMemo(() => {
    return assignableUsers.filter((u) => u.role === "admin");
  }, [assignableUsers]);

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filterAuditType && filterAuditType !== "all") count++;
    if (filterStatus && filterStatus !== "all") count++;
    if (filterAssignedTo && filterAssignedTo !== "all") count++;
    if (filterAssignedAdmin && filterAssignedAdmin !== "all") count++;
    if (filterFollowUpRange && filterFollowUpRange !== "today") {
      if (filterFollowUpRange !== "custom" || filterFollowUpFrom || filterFollowUpTo) count++;
    }
    if (filterCreatedAtRange && filterCreatedAtRange !== "all") {
      if (filterCreatedAtRange !== "custom" || filterCreatedAtFrom || filterCreatedAtTo) count++;
    }
    return count;
  }, [
    filterAuditType,
    filterStatus,
    filterAssignedTo,
    filterAssignedAdmin,
    filterFollowUpRange,
    filterFollowUpFrom,
    filterFollowUpTo,
    filterCreatedAtRange,
    filterCreatedAtFrom,
    filterCreatedAtTo,
  ]);

  const handleClearAllFilters = () => {
    setFilterAuditType("all");
    setFilterStatus("all");
    setFilterAssignedTo("all");
    setFilterAssignedAdmin("all");
    setFilterFollowUpRange("today");
    setFilterFollowUpFrom("");
    setFilterFollowUpTo("");
    setFilterCreatedAtRange("all");
    setFilterCreatedAtFrom("");
    setFilterCreatedAtTo("");
  };

  const handleExportExcel = () => {
    const wsData = filtered.map((row) => ({
      "Name/Organisation": row.name ?? "",
      City: row.city ?? "",
      Address: row.address ?? "",
      Status: row.enquiry_status ?? "",
      "Assigned To":
        row.assigned_to && typeof row.assigned_to === "object"
          ? row.assigned_to.name ?? row.assigned_to.email ?? ""
          : row.assigned_to ?? "",
      "Assigned Admin":
        row.assigned_admin_to && typeof row.assigned_admin_to === "object"
          ? row.assigned_admin_to.name ?? row.assigned_admin_to.email ?? ""
          : row.assigned_admin_to ?? "",
      "Expected Value": row.expected_value ?? "",
      "Audit Types": row.requested_audit_types?.join(", ") ?? "",
      "Next Follow Up": row.next_followup_date
        ? new Date(row.next_followup_date).toLocaleDateString()
        : "",
      "Created At": row.created_at
        ? new Date(row.created_at).toLocaleDateString()
        : "",
      Notes: row.notes ?? "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enquiries");
    XLSX.writeFile(workbook, `enquiries_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const [deleteEnquiry, { isLoading: isDeleting }] =
    useDeleteEnquiryMutation();

  const enquiries = useMemo(() => {
    const raw = data?.data ?? [];
    if (user?.role === "admin") {
      return raw.filter((item) => {
        const adminId =
          item.assigned_admin_to && typeof item.assigned_admin_to === "object"
            ? item.assigned_admin_to._id
            : item.assigned_admin_to;
        return adminId === user?._id;
      });
    }
    return raw;
  }, [data, user]);

  const filtered = useMemo(() => {
    let list = enquiries;

    // 1. Search Query
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((row) => enquirySearchHaystack(row).includes(q));
    }

    // 2. Audit Type
    if (filterAuditType && filterAuditType !== "all") {
      list = list.filter((row) =>
        row.requested_audit_types?.includes(filterAuditType as any)
      );
    }

    // 3. Status
    if (filterStatus && filterStatus !== "all") {
      list = list.filter((row) => row.enquiry_status === filterStatus);
    }

    // 4. Assigned to
    if (filterAssignedTo && filterAssignedTo !== "all") {
      list = list.filter((row) => {
        const id = typeof row.assigned_to === "object" && row.assigned_to !== null
          ? row.assigned_to._id
          : row.assigned_to;
        return id === filterAssignedTo;
      });
    }

    // 5. Assigned Admin
    if (filterAssignedAdmin && filterAssignedAdmin !== "all") {
      list = list.filter((row) => {
        const id = typeof row.assigned_admin_to === "object" && row.assigned_admin_to !== null
          ? row.assigned_admin_to._id
          : row.assigned_admin_to;
        return id === filterAssignedAdmin;
      });
    }

    // 6. Next Follow Up Date Range
    if (filterFollowUpRange && filterFollowUpRange !== "all") {
      list = list.filter((row) => checkNextFollowUp(row.next_followup_date, filterFollowUpRange, filterFollowUpFrom, filterFollowUpTo));
    }

    // 7. Created At Date Range
    if (filterCreatedAtRange && filterCreatedAtRange !== "all") {
      list = list.filter((row) => checkCreatedAt(row.created_at || (row.created_by && typeof row.created_by === "object" && row.created_by.created_at) || undefined, filterCreatedAtRange, filterCreatedAtFrom, filterCreatedAtTo));
    }

    return list;
  }, [
    enquiries,
    searchQuery,
    filterAuditType,
    filterStatus,
    filterAssignedTo,
    filterAssignedAdmin,
    filterFollowUpRange,
    filterFollowUpFrom,
    filterFollowUpTo,
    filterCreatedAtRange,
    filterCreatedAtFrom,
    filterCreatedAtTo,
  ]);

  const totalFiltered = filtered.length;
  const totalPages =
    totalFiltered === 0 ? 1 : Math.ceil(totalFiltered / PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    filterAuditType,
    filterStatus,
    filterAssignedTo,
    filterAssignedAdmin,
    filterFollowUpRange,
    filterFollowUpFrom,
    filterFollowUpTo,
    filterCreatedAtRange,
    filterCreatedAtFrom,
    filterCreatedAtTo,
  ]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);



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
      key: "address",
      header: "Address",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {row.address || "—"}
        </span>
      ),
    },
    {
      key: "requested_audit_types",
      header: "Audit Type",
      hideOnMobile: true,
      render: (row) => {
        const types = row.requested_audit_types || [];
        if (types.length === 0) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-md bg-secondary/50 px-2 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                {t}
              </span>
            ))}
          </div>
        );
      },
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
      key: "assigned_admin_to",
      header: "Assigned Admin",
      hideOnMobile: true,
      render: (row) => {
        const a = row.assigned_admin_to;
        if (!a) return <span className="text-muted-foreground">—</span>;
        if (typeof a === "object")
          return (
            <span className="text-foreground">{a.name ?? a.email ?? "—"}</span>
          );
        return <span className="font-mono text-xs">{String(a)}</span>;
      },
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
      key: "created_at",
      header: "Created At",
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-foreground">
          {row.created_at
            ? new Date(row.created_at).toLocaleDateString()
            : "—"}
        </span>
      ),
    },

  ];

  const EnquiriesTable = DataTable as any;

  return (
    <DashboardLayout
      title="Enquiries"
      subtitle="Sales pipeline and lead tracking"
    >
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 w-full flex-1 sm:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, city, status, contacts, notes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-input pl-9"
          />
        </div>

        <div className="flex w-full sm:w-auto items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPreviewOpen(true)}
            className="w-full sm:w-auto gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Preview & Export
          </Button>
          {canCreateEnquiry ? (
            <Button
              onClick={() => setCreateOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create enquiry
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mb-4 rounded-lg border border-border bg-muted/10 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Audit Type
            </Label>
            <Select value={filterAuditType} onValueChange={setFilterAuditType}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Audit Types</SelectItem>
                {REQUESTED_AUDIT_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Pipeline Status
            </Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ENQUIRY_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned User
            </Label>
            <Select value={filterAssignedTo} onValueChange={setFilterAssignedTo}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assigned Users</SelectItem>
                {assignableAuditorsAndManagers.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Assigned Admin
            </Label>
            <Select value={filterAssignedAdmin} onValueChange={setFilterAssignedAdmin}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assigned Admins</SelectItem>
                {assignableAdmins.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Next Follow Up
            </Label>
            <Select value={filterFollowUpRange} onValueChange={setFilterFollowUpRange}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Dates</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="tomorrow">Tomorrow</SelectItem>
                <SelectItem value="this_week">This Week (Next 7 Days)</SelectItem>
                <SelectItem value="next_week">Next 2 Weeks (Next 14 Days)</SelectItem>
                <SelectItem value="custom">Custom Range…</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Created At
            </Label>
            <Select value={filterCreatedAtRange} onValueChange={setFilterCreatedAtRange}>
              <SelectTrigger className="h-9 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="last_week">Last 7 Days</SelectItem>
                <SelectItem value="last_month">Last 30 Days</SelectItem>
                <SelectItem value="3_months">Last 90 Days</SelectItem>
                <SelectItem value="custom">Custom Range…</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {(filterFollowUpRange === "custom" || filterCreatedAtRange === "custom") && (
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filterFollowUpRange === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Follow-up From</Label>
                  <Input
                    type="date"
                    value={filterFollowUpFrom}
                    onChange={(e) => setFilterFollowUpFrom(e.target.value)}
                    className="mt-1 h-9 bg-background text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Follow-up To</Label>
                  <Input
                    type="date"
                    value={filterFollowUpTo}
                    onChange={(e) => setFilterFollowUpTo(e.target.value)}
                    className="mt-1 h-9 bg-background text-xs"
                  />
                </div>
              </div>
            )}
            {filterCreatedAtRange === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Created From</Label>
                  <Input
                    type="date"
                    value={filterCreatedAtFrom}
                    onChange={(e) => setFilterCreatedAtFrom(e.target.value)}
                    className="mt-1 h-9 bg-background text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">Created To</Label>
                  <Input
                    type="date"
                    value={filterCreatedAtTo}
                    onChange={(e) => setFilterCreatedAtTo(e.target.value)}
                    className="mt-1 h-9 bg-background text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeFiltersCount > 0 && (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <FilterX className="mr-1.5 h-3.5 w-3.5" />
              Reset Filters
            </Button>
          </div>
        )}
      </div>

      <EnquiriesTable
        columns={columns}
        data={paginated}
        loading={enquiriesLoading}
        onRowClick={(row?: Enquiry) => row && router.push(`/enquiries/${row._id}`)}
        emptyMessage="No enquiries found"
      />

      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {totalFiltered === 0 ? (
            <>
              {enquiries.length === 0
                ? "No enquiries yet."
                : "No enquiries match your search or filters."}
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

      {canCreateEnquiry ? (
        <CreateEnquiryForm
          open={createOpen}
          onOpenChange={setCreateOpen}
          onComplete={() => void refetchEnquiries()}
        />
      ) : null}

      {user ? (
        <EditEnquiryForm
          open={editOpen}
          onOpenChange={setEditOpen}
          onComplete={() => {
            setSelectedEnquiryId(null);
            void refetchEnquiries();
          }}
          enquiryId={selectedEnquiryId}
        />
      ) : null}

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="w-[80vw] sm:max-w-[80vw] max-w-[80vw] h-[80vh] sm:max-h-[80vh] max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <span>Excel Export Preview</span>
              <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {filtered.length} rows to export
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-md my-4">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-muted sticky top-0 z-10">
                <tr className="border-b">
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Name/Organisation</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">City</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Address</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Status</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Assigned To</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Assigned Admin</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Expected Value</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Audit Types</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Next Follow Up</th>
                  <th className="p-2.5 text-left font-medium border-r whitespace-nowrap">Created At</th>
                  <th className="p-2.5 text-left font-medium whitespace-nowrap">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((row, idx) => (
                  <tr key={row._id ?? idx} className="hover:bg-muted/30">
                    <td className="p-2 border-r whitespace-nowrap font-medium">{row.name ?? "—"}</td>
                    <td className="p-2 border-r whitespace-nowrap">{row.city ?? "—"}</td>
                    <td className="p-2 border-r max-w-xs truncate">{row.address ?? "—"}</td>
                    <td className="p-2 border-r whitespace-nowrap">{row.enquiry_status ?? "—"}</td>
                    <td className="p-2 border-r whitespace-nowrap">
                      {row.assigned_to && typeof row.assigned_to === "object"
                        ? row.assigned_to.name ?? row.assigned_to.email ?? "—"
                        : row.assigned_to ?? "—"}
                    </td>
                    <td className="p-2 border-r whitespace-nowrap">
                      {row.assigned_admin_to && typeof row.assigned_admin_to === "object"
                        ? row.assigned_admin_to.name ?? row.assigned_admin_to.email ?? "—"
                        : row.assigned_admin_to ?? "—"}
                    </td>
                    <td className="p-2 border-r whitespace-nowrap">{row.expected_value != null ? `$${row.expected_value}` : "—"}</td>
                    <td className="p-2 border-r max-w-xs truncate">{row.requested_audit_types?.join(", ") || "—"}</td>
                    <td className="p-2 border-r whitespace-nowrap">
                      {row.next_followup_date
                        ? new Date(row.next_followup_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-2 border-r whitespace-nowrap">
                      {row.created_at
                        ? new Date(row.created_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-2 max-w-xs truncate">{row.notes ?? "—"}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="p-8 text-center text-muted-foreground">
                      No data to preview
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="flex sm:justify-between items-center gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close Preview
            </Button>
            <Button onClick={handleExportExcel} disabled={filtered.length === 0} className="gap-2">
              <Download className="h-4 w-4" />
              Download Excel (.xlsx)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
