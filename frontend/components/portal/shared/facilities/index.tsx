"use client";

import {
  canManageResource,
  canViewFacilitiesSheet,
} from "@/components/portal/lib/authRoles";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { Button } from "@/components/portal/ui/button";
import { Input } from "@/components/portal/ui/input";
import { Card } from "@/components/portal/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/portal/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/portal/ui/select";
import { Skeleton } from "@/components/portal/ui/skeleton";
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
import { CreateFacilityForm } from "@/components/portal/shared/components/facility/create-facility-form";
import { EditFacilityForm } from "@/components/portal/shared/components/facility/edit-facility-form";
import { FacilitiesSheetModal } from "./facilities-sheet-modal";
import {
  Plus,
  Search,
  Building2,
  Pencil,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";
import {
  type Facility,
  useGetFacilitiesQuery,
  useGetFacilitiesUtilityProgressQuery,
  useDeleteFacilityMutation,
} from "@/store/slices/facilityApiSlice";
import { FacilityUtilityAuditProgress } from "@/components/portal/shared/facility/[auditType]/[facilityId]/_components/facility-utility-audit-progress";
import { useAppSelector } from "@/store/hooks";
import { facilityPath } from "@/components/portal/lib/facilityRoutes";
import { AUDIT_TYPE_OPTIONS, facilityExpectedValue } from "@/components/portal/lib/facilityConstants";
import { formatInr } from "@/components/portal/lib/quotationConstants";

const PAGE_SIZE = 12;

type ClosureFilter = "all" | "open" | "closed";

function isFacilityAuditClosed(facility: Facility): boolean {
  return Boolean(facility.audit_closure?.closed_at);
}

function supportsFacilityUtilityProgress(auditType?: string): boolean {
  return (
    auditType === "Electrical Energy Audit" ||
    auditType === "Electrical Safety Audit"
  );
}

function facilitySearchHaystack(facility: Facility): string {
  const auditor =
    facility.auditor_id &&
    typeof facility.auditor_id === "object" &&
    facility.auditor_id !== null
      ? [facility.auditor_id.name, facility.auditor_id.email].filter(Boolean)
      : [];

  const closedBy = facility.audit_closure?.closed_by
    ? typeof facility.audit_closure.closed_by === "string"
      ? [facility.audit_closure.closed_by]
      : [
          facility.audit_closure.closed_by._id,
          facility.audit_closure.closed_by.name,
          facility.audit_closure.closed_by.email,
        ].filter(Boolean)
    : [];

  const reopenedBy = facility.audit_closure?.reopened_by
    ? typeof facility.audit_closure.reopened_by === "string"
      ? [facility.audit_closure.reopened_by]
      : [
          facility.audit_closure.reopened_by._id,
          facility.audit_closure.reopened_by.name,
          facility.audit_closure.reopened_by.email,
        ].filter(Boolean)
    : [];

  const reps = (facility.client_representatives ?? []).flatMap((cr) =>
    [cr.name, cr.contact_number, cr.email].filter(Boolean),
  );

  const closureLabel = facility.audit_closure?.closed_at
    ? "closed closure"
    : "open";

  const parts = [
    facility.name,
    facility.audit_number,
    facility.enquiry_number,
    facility.city,
    facility.address,
    facility.client_representative,
    facility.client_contact_number,
    facility.client_email,
    facility.facility_type,
    facility.audit_type,
    facility.expected_value != null ? String(facility.expected_value) : null,
    facility.budget?.tentative_budget != null
      ? String(facility.budget.tentative_budget)
      : null,
    closureLabel,
    facility.start_date,
    facility.audit_date,
    facility.closure_date,
    facility.created_at,
    facility.updated_at,
    facility.createdAt,
    facility.updatedAt,
    facility._id,
    facility.created_by,
    ...(facility.documents?.flatMap((d) => [d.fileName, d.fileUrl]) ?? []),
    ...auditor,
    ...closedBy,
    ...reopenedBy,
    ...reps,
  ];

  return parts.filter(Boolean).join(" ").toLowerCase();
}

export default function FacilitiesPage() {
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAuditType, setSelectedAuditType] = useState<string>("all");
  const [selectedClosureFilter, setSelectedClosureFilter] =
    useState<ClosureFilter>("open");
  const [page, setPage] = useState(1);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Facility | null>(null);

  const user = useAppSelector((state) => state.auth.user);
  const canCreateFacility = canManageResource(
    user?.role,
    user?.permissions || [],
    "facility",
    "create",
  );
  const canUpdateFacility = user?.role === "super_admin" || user?.role === "admin";
  const canDeleteFacility = user?.role === "super_admin";
  const canViewSheet = canViewFacilitiesSheet(user?.role);

  const {
    data,
    isLoading: facilitiesLoading,
    refetch: refetchFacilities,
  } = useGetFacilitiesQuery();

  const facilities = data?.data || [];

  const filteredFacilities = useMemo(() => {
    let result = facilities;

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter((facility) =>
        facilitySearchHaystack(facility).includes(q)
      );
    }

    // Audit type filter
    if (selectedAuditType !== "all") {
      result = result.filter(
        (facility) => facility.audit_type === selectedAuditType
      );
    }

    // Audit closure filter
    if (selectedClosureFilter === "open") {
      result = result.filter((facility) => !isFacilityAuditClosed(facility));
    } else if (selectedClosureFilter === "closed") {
      result = result.filter((facility) => isFacilityAuditClosed(facility));
    }

    return result;
  }, [facilities, searchQuery, selectedAuditType, selectedClosureFilter]);

  const totalFiltered = filteredFacilities.length;
  const totalPages =
    totalFiltered === 0 ? 1 : Math.ceil(totalFiltered / PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, selectedAuditType, selectedClosureFilter]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginatedFacilities = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredFacilities.slice(start, start + PAGE_SIZE);
  }, [filteredFacilities, page]);

  const progressFacilityIds = useMemo(
    () =>
      paginatedFacilities
        .filter((facility) => supportsFacilityUtilityProgress(facility.audit_type))
        .map((facility) => facility._id),
    [paginatedFacilities],
  );

  const { data: utilityProgressResponse, isLoading: utilityProgressLoading } =
    useGetFacilitiesUtilityProgressQuery(
      { facility_ids: progressFacilityIds },
      { skip: progressFacilityIds.length === 0 },
    );

  const utilityProgressByFacilityId = utilityProgressResponse?.data ?? {};

  const [deleteFacility, { isLoading: isDeleting }] =
    useDeleteFacilityMutation();

  const handleEditFacility = (
    e: React.MouseEvent<HTMLButtonElement>,
    facility: Facility,
  ) => {
    e.stopPropagation();
    setSelectedFacilityId(facility._id);
    setEditOpen(true);
  };

  const handleDeleteFacility = (
    e: React.MouseEvent<HTMLButtonElement>,
    facility: Facility,
  ) => {
    e.stopPropagation();
    setDeleteTarget(facility);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteFacility = async () => {
    if (!deleteTarget?._id) return;
    try {
      await deleteFacility(deleteTarget._id).unwrap();
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete facility:", error);
    }
  };

  const handleRowClick = (facility: Facility) => {
    router.push(facilityPath(facility.audit_type, facility._id));
  };

  const handleCreateFacility = () => {
    setIsWizardOpen(false);
    refetchFacilities();
  };

  const handleEditComplete = () => {
    setEditOpen(false);
    setSelectedFacilityId(null);
    refetchFacilities();
  };

  return (
    <DashboardLayout
      title="Facilities"
      subtitle="Manage all audited facilities"
    >
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="relative min-w-0 w-full flex-1 sm:max-w-xl">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, city, type, closure, contacts, audit type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-input pl-9"
          />
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {canViewSheet ? (
            <Button
              variant="outline"
              onClick={() => setIsSheetOpen(true)}
              className="w-full sm:w-auto flex items-center gap-2 border-primary/30 text-primary hover:bg-primary/5"
            >
              <FileSpreadsheet className="h-4 w-4" />
              View in Sheet
            </Button>
          ) : null}

          {canCreateFacility ? (
            <Button
              onClick={() => setIsWizardOpen(true)}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Facility
            </Button>
          ) : null}
        </div>
      </div>

      {/* Audit type tabs + closure filter */}
      <div className="mb-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1 overflow-x-auto">
          <Tabs
            value={selectedAuditType}
            onValueChange={setSelectedAuditType}
            className="w-full"
          >
            <TabsList className="inline-flex w-max min-w-full justify-start bg-muted/50 p-1 md:min-w-0">
              <TabsTrigger value="all" className="px-4 py-2">
                All Facilities
              </TabsTrigger>
              {AUDIT_TYPE_OPTIONS.map((type) => (
                <TabsTrigger key={type} value={type} className="px-4 py-2">
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <Select
          value={selectedClosureFilter}
          onValueChange={(value) =>
            setSelectedClosureFilter(value as ClosureFilter)
          }
        >
          <SelectTrigger className="w-full shrink-0 bg-input sm:w-[160px]">
            <SelectValue placeholder="Audit status" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Facilities Cards/Widgets listing */}
      {facilitiesLoading ? (
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex min-w-0 flex-col gap-2 overflow-hidden py-0">
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-16 shrink-0" />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                  <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : paginatedFacilities.length === 0 ? (
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed">
          <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4 animate-pulse" />
          <h3 className="text-lg font-semibold text-foreground">No facilities found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {facilities.length === 0
              ? "Get started by creating your first facility."
              : "No facilities match your search, audit type, or closure status."}
          </p>
          {canCreateFacility && facilities.length === 0 && (
            <Button onClick={() => setIsWizardOpen(true)} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Facility
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {paginatedFacilities.map((facility) => {
            const isClosed = isFacilityAuditClosed(facility);
            const showProgress =
              supportsFacilityUtilityProgress(facility.audit_type);
            const utilityProgress = utilityProgressByFacilityId[facility._id];
            const expectedValue = facilityExpectedValue(facility);
            return (
              <Card
                key={facility._id}
                onClick={() => handleRowClick(facility)}
                className="group relative flex min-w-0 cursor-pointer flex-col gap-0 overflow-hidden border-border bg-card py-0 transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <div className="flex min-w-0 flex-col gap-2 p-3">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:text-primary">
                        {facility.name}
                      </h3>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1 font-mono text-[10px] text-muted-foreground/75">
                        {facility.audit_number ? (
                          <span>{facility.audit_number}</span>
                        ) : null}
                        {facility.enquiry_number ? (
                          <span>ENQ: {facility.enquiry_number}</span>
                        ) : null}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize leading-none text-muted-foreground">
                      {facility.facility_type || "Facility"}
                    </span>
                  </div>

                  <div className="flex min-w-0 items-center gap-3">
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <p className="truncate text-xs text-muted-foreground">
                        {facility.city || "Unknown city"}
                      </p>
                      {expectedValue != null ? (
                        <p className="text-xs font-medium text-foreground">
                          Expected value: {formatInr(expectedValue)}
                        </p>
                      ) : null}
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <span
                          title={
                            isClosed
                              ? "Facility audit closed"
                              : "Facility audit open"
                          }
                          className={`inline-flex max-w-full rounded-full px-2 py-0.5 text-[10px] font-medium leading-none sm:max-w-none sm:text-xs ${
                            isClosed
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                          }`}
                        >
                          {isClosed ? "Audit closed" : "Audit open"}
                        </span>
                        {facility.audit_type ? (
                          <span className="inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium leading-none text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 sm:text-xs">
                            {facility.audit_type}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {showProgress ? (
                      <div
                        className="shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {utilityProgressLoading ? (
                          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                        ) : utilityProgress ? (
                          <FacilityUtilityAuditProgress
                            compact
                            size={36}
                            strokeWidth={3}
                            summary={utilityProgress}
                          />
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  {canUpdateFacility || canDeleteFacility ? (
                    <div
                      className="flex items-center justify-end gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:bg-muted hover:text-foreground"
                        disabled={!canUpdateFacility || isClosed}
                        title={
                          !canUpdateFacility
                            ? "You do not have permission to edit facilities."
                            : isClosed
                              ? "Facility audit is closed; editing is locked."
                              : "Edit Facility"
                        }
                        onClick={(e) => handleEditFacility(e, facility)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      {canDeleteFacility ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          disabled={isDeleting}
                          title="Delete Facility"
                          onClick={(e) => handleDeleteFacility(e, facility)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="mt-6 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground sm:text-sm">
          {totalFiltered === 0 ? (
            <>
              {facilities.length === 0
                ? "No facilities yet."
                    : "No facilities match your search or filters."}
            </>
          ) : (
            <>
              Showing {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, totalFiltered)} of {totalFiltered}{" "}
              facilities
            </>
          )}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || facilitiesLoading}
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
            disabled={page >= totalPages || facilitiesLoading || totalFiltered === 0}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {canCreateFacility || canUpdateFacility ? (
        <>
          {canCreateFacility ? (
            <CreateFacilityForm
              open={isWizardOpen}
              onOpenChange={setIsWizardOpen}
              onComplete={handleCreateFacility}
            />
          ) : null}
          {canUpdateFacility ? (
            <EditFacilityForm
              open={editOpen}
              onOpenChange={setEditOpen}
              onComplete={handleEditComplete}
              facilityId={selectedFacilityId}
            />
          ) : null}
        </>
      ) : null}

      {canViewSheet ? (
        <FacilitiesSheetModal
          facilities={facilities}
          open={isSheetOpen}
          onOpenChange={setIsSheetOpen}
        />
      ) : null}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete facility?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete{" "}
              <strong>{deleteTarget?.name || "this facility"}</strong>. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={() => void confirmDeleteFacility()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete Facility"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
