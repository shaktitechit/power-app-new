"use client";

import { assigneeLabel, filterEnquiriesForUser } from "@/components/portal/lib/enquiryAccess";
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
import { Plus, Search, MessageSquare, FileSpreadsheet, Download, BarChart3, CalendarClock, FileText, Loader2, Columns3, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/portal/ui/checkbox";
import { toast } from "sonner";
import { useCompanyBranding } from "@/components/portal/shared/components/company-branding-provider";
import { useGetDefaultCompanyQuery } from "@/store/slices/companyApiSlice";
import {
  ENQUIRY_EXPORT_COLUMNS,
  buildEnquiryExcelSheetRows,
  defaultEnquiryExportColumnKeys,
  enquiryExportCellValue,
  resolveEnquiryExportColumns,
  type EnquiryExportColumnKey,
} from "@/components/portal/lib/enquiryExport";
import {
  buildEnquiryListPdfBlob,
  enquiryListPdfFilename,
  type EnquiryListPdfOrientation,
} from "@/components/portal/lib/enquiryListPdf";
import { Tabs, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import { useAssignableUsersQuery } from "@/store/slices/userApiSlice";
import {
  ENQUIRY_PIPELINE_STEPS,
} from "@/components/portal/lib/enquiryConstants";
import {
  type Enquiry,
  useGetEnquiriesQuery,
  useDeleteEnquiryMutation,
} from "@/store/slices/enquiryApiSlice";
import { useAppSelector } from "@/store/hooks";
import { EnquiryListFilterPanel } from "@/components/portal/shared/components/enquiry/enquiry-list-filter-panel";
import {
  countActiveEnquiryListFilters,
  filterEnquiryList,
  matchesEnquiryPipelineTab,
  type EnquiryListFilters,
  type EnquiryPipelineTab,
} from "@/components/portal/lib/enquiryListFilters";

const PAGE_SIZE = 10;

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
  const [pipelineTab, setPipelineTab] = useState<EnquiryPipelineTab>("all");
  const [filterAssignedTo, setFilterAssignedTo] = useState("all");
  const [filterAssignedManager, setFilterAssignedManager] = useState("all");
  const [filterAssignedAdmin, setFilterAssignedAdmin] = useState("all");
  const [filterFollowUpRange, setFilterFollowUpRange] = useState("all");

  const [filterFollowUpFrom, setFilterFollowUpFrom] = useState("");
  const [filterFollowUpTo, setFilterFollowUpTo] = useState("");
  const [filterCreatedAtRange, setFilterCreatedAtRange] = useState("all");
  const [filterCreatedAtFrom, setFilterCreatedAtFrom] = useState("");
  const [filterCreatedAtTo, setFilterCreatedAtTo] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportFiltersOpen, setExportFiltersOpen] = useState(false);
  const [exportColumnsOpen, setExportColumnsOpen] = useState(false);
  const [exportColumnKeys, setExportColumnKeys] = useState<EnquiryExportColumnKey[]>(
    defaultEnquiryExportColumnKeys,
  );
  const [pdfGenerating, setPdfGenerating] = useState<EnquiryListPdfOrientation | null>(null);
  const [exportFilters, setExportFilters] = useState<EnquiryListFilters>({
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
  });

  const { displayName, logoSrc, primaryColor } = useCompanyBranding();
  const { data: companyRes } = useGetDefaultCompanyQuery();

  const user = useAppSelector((state) => state.auth.user);

  const selectedExportColumns = useMemo(
    () => resolveEnquiryExportColumns(exportColumnKeys),
    [exportColumnKeys],
  );

  const toggleExportColumn = (key: EnquiryExportColumnKey, checked: boolean) => {
    setExportColumnKeys((current) => {
      if (checked) {
        if (current.includes(key)) return current;
        const next = [...current, key];
        return ENQUIRY_EXPORT_COLUMNS.map((column) => column.key).filter((columnKey) =>
          next.includes(columnKey),
        );
      }
      if (current.length <= 1) return current;
      return current.filter((columnKey) => columnKey !== key);
    });
  };

  const selectAllExportColumns = () => {
    setExportColumnKeys(ENQUIRY_EXPORT_COLUMNS.map((column) => column.key));
  };

  const resetExportColumns = () => {
    setExportColumnKeys(defaultEnquiryExportColumnKeys());
  };

  const listFilters = useMemo(
    (): EnquiryListFilters => ({
      searchQuery,
      pipelineTab,
      filterAuditType,
      filterAssignedTo,
      filterAssignedManager,
      filterAssignedAdmin,
      filterFollowUpRange,
      filterFollowUpFrom,
      filterFollowUpTo,
      filterCreatedAtRange,
      filterCreatedAtFrom,
      filterCreatedAtTo,
    }),
    [
      searchQuery,
      pipelineTab,
      filterAuditType,
      filterAssignedTo,
      filterAssignedManager,
      filterAssignedAdmin,
      filterFollowUpRange,
      filterFollowUpFrom,
      filterFollowUpTo,
      filterCreatedAtRange,
      filterCreatedAtFrom,
      filterCreatedAtTo,
    ],
  );

  const applyListFilters = (next: EnquiryListFilters) => {
    setSearchQuery(next.searchQuery);
    setPipelineTab(next.pipelineTab);
    setFilterAuditType(next.filterAuditType);
    setFilterAssignedTo(next.filterAssignedTo);
    setFilterAssignedManager(next.filterAssignedManager);
    setFilterAssignedAdmin(next.filterAssignedAdmin);
    setFilterFollowUpRange(next.filterFollowUpRange);
    setFilterFollowUpFrom(next.filterFollowUpFrom);
    setFilterFollowUpTo(next.filterFollowUpTo);
    setFilterCreatedAtRange(next.filterCreatedAtRange);
    setFilterCreatedAtFrom(next.filterCreatedAtFrom);
    setFilterCreatedAtTo(next.filterCreatedAtTo);
  };

  const handleOpenPreview = () => {
    setExportFilters(listFilters);
    setPreviewOpen(true);
  };

  const canCreateEnquiry = Boolean(user);

  const {
    data,
    isLoading: enquiriesLoading,
    refetch: refetchEnquiries,
  } = useGetEnquiriesQuery();

  const { data: assignableRes } = useAssignableUsersQuery();
  const assignableUsers = assignableRes?.data ?? [];
  const assignableAuditors = useMemo(() => {
    return assignableUsers.filter((u) => u.role === "auditor");
  }, [assignableUsers]);
  const assignableManagers = useMemo(() => {
    return assignableUsers.filter((u) => u.role === "manager");
  }, [assignableUsers]);
  const assignableAdmins = useMemo(() => {
    return assignableUsers.filter((u) => u.role === "admin");
  }, [assignableUsers]);

  const handleExportExcel = (rows: Enquiry[]) => {
    if (selectedExportColumns.length === 0) return;
    const wsData = buildEnquiryExcelSheetRows(rows, selectedExportColumns);
    const worksheet = XLSX.utils.json_to_sheet(wsData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Enquiries");
    XLSX.writeFile(workbook, `enquiries_export_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  const handleExportPdf = async (
    orientation: EnquiryListPdfOrientation,
    rows: Enquiry[],
  ) => {
    if (rows.length === 0 || selectedExportColumns.length === 0) return;
    setPdfGenerating(orientation);
    try {
      const blob = await buildEnquiryListPdfBlob({
        rows,
        columns: selectedExportColumns,
        company: companyRes?.data,
        logoSrc,
        brandName: displayName,
        primaryColor,
        orientation,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = enquiryListPdfFilename(orientation);
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate enquiries PDF.");
    } finally {
      setPdfGenerating(null);
    }
  };

  const [deleteEnquiry, { isLoading: isDeleting }] =
    useDeleteEnquiryMutation();

  const enquiries = useMemo(
    () => filterEnquiriesForUser(data?.data ?? [], user),
    [data, user],
  );

  const pipelineCounts = useMemo(() => {
    const counts: Record<EnquiryPipelineTab, number> = {
      all: enquiries.length,
      new: 0,
      assigned: 0,
      follow_up: 0,
      eoi_sent: 0,
      quoted: 0,
      decision: 0,
    };
    for (const row of enquiries) {
      for (const step of ENQUIRY_PIPELINE_STEPS) {
        if (matchesEnquiryPipelineTab(row, step.key)) {
          counts[step.key]++;
        }
      }
    }
    return counts;
  }, [enquiries]);

  const filtered = useMemo(
    () => filterEnquiryList(enquiries, listFilters),
    [enquiries, listFilters],
  );

  const exportFiltered = useMemo(
    () => filterEnquiryList(enquiries, exportFilters),
    [enquiries, exportFilters],
  );

  const listActiveFiltersCount = useMemo(
    () => countActiveEnquiryListFilters(listFilters),
    [listFilters],
  );

  const exportActiveFiltersCount = useMemo(
    () => countActiveEnquiryListFilters(exportFilters),
    [exportFilters],
  );

  const totalFiltered = filtered.length;
  const totalPages =
    totalFiltered === 0 ? 1 : Math.ceil(totalFiltered / PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [
    searchQuery,
    pipelineTab,
    filterAuditType,
    filterAssignedTo,
    filterAssignedManager,
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
            {row.enquiry_number && (
              <span className="inline-block mt-0.5 px-1.5 py-0.2 text-[10px] font-mono font-semibold bg-secondary rounded text-muted-foreground">
                {row.enquiry_number}
              </span>
            )}
            <p className="truncate text-xs text-muted-foreground sm:text-sm mt-0.5">
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
      header: "Auditor",
      hideOnMobile: true,
      render: (row) => {
        const label = assigneeLabel(row.assigned_to);
        return label ? (
          <span className="text-foreground">{label}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "assigned_manager_to",
      header: "Manager",
      hideOnMobile: true,
      render: (row) => {
        const label = assigneeLabel(row.assigned_manager_to);
        return label ? (
          <span className="text-foreground">{label}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "assigned_admin_to",
      header: "Admin",
      hideOnMobile: true,
      render: (row) => {
        const label = assigneeLabel(row.assigned_admin_to);
        return label ? (
          <span className="text-foreground">{label}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
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
        <div className="flex w-full sm:w-auto items-center gap-2 flex-wrap sm:flex-nowrap">
          <Button
            variant="outline"
            onClick={() => setFiltersOpen(true)}
            className="w-full sm:w-auto gap-2"
          >
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Filters
            {listActiveFiltersCount > 0 ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                {listActiveFiltersCount}
              </span>
            ) : null}
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto gap-2">
            <Link href="/enquiries/analytics">
              <BarChart3 className="h-4 w-4 text-primary" />
              Analytics
            </Link>
          </Button>
          <Button variant="outline" asChild className="w-full sm:w-auto gap-2">
            <Link href="/enquiries/follow-ups">
              <CalendarClock className="h-4 w-4 text-primary" />
              Follow-ups
            </Link>
          </Button>
          <Button
            variant="outline"
            onClick={handleOpenPreview}
            className="w-full sm:w-auto gap-2"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Preview
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExportExcel(filtered)}
            className="w-full sm:w-auto gap-2"
            disabled={filtered.length === 0}
          >
            <Download className="h-4 w-4 text-primary" />
            Export Excel
          </Button>
          {canCreateEnquiry && (
            <Button
              onClick={() => setCreateOpen(true)}
              className="w-full sm:w-auto whitespace-nowrap"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create enquiry
            </Button>
          )}
        </div>
      </div>

      <Tabs
        value={pipelineTab}
        onValueChange={(value) => setPipelineTab(value as EnquiryPipelineTab)}
        className="mb-4"
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 p-1">
          <TabsTrigger value="all" className="gap-1.5 px-3 py-2 text-xs sm:text-sm">
            All
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
              {pipelineCounts.all}
            </span>
          </TabsTrigger>
          {ENQUIRY_PIPELINE_STEPS.map((step) => (
            <TabsTrigger
              key={step.key}
              value={step.key}
              className="gap-1.5 px-3 py-2 text-xs sm:text-sm"
            >
              {step.label}
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums">
                {pipelineCounts[step.key]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

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

      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Filter enquiries</DialogTitle>
          </DialogHeader>
          <EnquiryListFilterPanel
            filters={listFilters}
            onChange={applyListFilters}
            assignableAuditors={assignableAuditors}
            assignableManagers={assignableManagers}
            assignableAdmins={assignableAdmins}
          />
          <DialogFooter>
            <Button type="button" onClick={() => setFiltersOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent fullscreen className="min-h-0">
          <DialogHeader className="shrink-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <DialogTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                <span>Export preview</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                  {exportFiltered.length} rows • {selectedExportColumns.length} columns
                </span>
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setExportFiltersOpen(true)}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                  {exportActiveFiltersCount > 0 ? (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                      {exportActiveFiltersCount}
                    </span>
                  ) : null}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setExportColumnsOpen(true)}
                >
                  <Columns3 className="h-4 w-4" />
                  Columns
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {selectedExportColumns.length}
                  </span>
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-auto rounded-md border">
            <table className="w-full border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="border-b">
                  {selectedExportColumns.map((column) => (
                    <th
                      key={column.key}
                      className="whitespace-nowrap border-r p-2.5 text-left font-medium last:border-r-0"
                    >
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {exportFiltered.map((row, idx) => (
                  <tr key={row._id ?? idx} className="hover:bg-muted/30">
                    {selectedExportColumns.map((column) => (
                      <td
                        key={column.key}
                        className="max-w-xs truncate whitespace-nowrap border-r p-2 last:border-r-0"
                      >
                        {enquiryExportCellValue(row, column.key)}
                      </td>
                    ))}
                  </tr>
                ))}
                {exportFiltered.length === 0 && (
                  <tr>
                    <td
                      colSpan={Math.max(selectedExportColumns.length, 1)}
                      className="p-8 text-center text-muted-foreground"
                    >
                      No data to preview
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="shrink-0 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close preview
            </Button>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                onClick={() => handleExportExcel(exportFiltered)}
                disabled={exportFiltered.length === 0 || selectedExportColumns.length === 0}
                className="gap-2"
                variant="outline"
              >
                <Download className="h-4 w-4" />
                Excel (.xlsx)
              </Button>
              <Button
                onClick={() => void handleExportPdf("portrait", exportFiltered)}
                disabled={
                  exportFiltered.length === 0 ||
                  selectedExportColumns.length === 0 ||
                  pdfGenerating != null
                }
                className="gap-2"
                variant="outline"
              >
                {pdfGenerating === "portrait" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                PDF portrait
              </Button>
              <Button
                onClick={() => void handleExportPdf("landscape", exportFiltered)}
                disabled={
                  exportFiltered.length === 0 ||
                  selectedExportColumns.length === 0 ||
                  pdfGenerating != null
                }
                className="gap-2"
              >
                {pdfGenerating === "landscape" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4" />
                )}
                PDF landscape
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportFiltersOpen} onOpenChange={setExportFiltersOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Export filters</DialogTitle>
          </DialogHeader>
          <EnquiryListFilterPanel
            filters={exportFilters}
            onChange={setExportFilters}
            assignableAuditors={assignableAuditors}
            assignableManagers={assignableManagers}
            assignableAdmins={assignableAdmins}
            showSearch
            showPipeline
          />
          <DialogFooter>
            <Button type="button" onClick={() => setExportFiltersOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={exportColumnsOpen} onOpenChange={setExportColumnsOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Select export columns</DialogTitle>
          </DialogHeader>
          <div className="mb-3 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={selectAllExportColumns}>
              Select all
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={resetExportColumns}>
              Reset
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {ENQUIRY_EXPORT_COLUMNS.map((column) => {
              const checked = exportColumnKeys.includes(column.key);
              return (
                <label
                  key={column.key}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleExportColumn(column.key, value === true)
                    }
                  />
                  <span className="truncate">{column.label}</span>
                </label>
              );
            })}
          </div>
          <DialogFooter>
            <Button type="button" onClick={() => setExportColumnsOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
