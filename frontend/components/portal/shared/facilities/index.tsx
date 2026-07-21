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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/portal/ui/card";
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
  MapPin,
  User,
  Phone,
  Mail,
  Calendar,
  ArrowRight,
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
import { AUDIT_TYPE_OPTIONS } from "@/components/portal/lib/facilityConstants";
import { cn } from "@/components/portal/lib/utils";

const PAGE_SIZE = 6;

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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex flex-col justify-between h-[320px] overflow-hidden">
              <CardHeader className="p-5 pb-3">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="mt-4 flex items-start gap-2.5">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="space-y-2 w-full">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-5 py-4 space-y-3.5 border-y bg-muted/5">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
              <CardFooter className="p-4 flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16 rounded" />
              </CardFooter>
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
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedFacilities.map((facility) => {
                const isClosed = isFacilityAuditClosed(facility);
            return (
              <Card
                key={facility._id}
                onClick={() => handleRowClick(facility)}
                className={cn(
                  "group relative flex flex-col justify-between border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-md cursor-pointer overflow-hidden",
                  isClosed
                    ? "border-l-emerald-500 hover:border-l-emerald-600"
                    : facility.audit_type === "Electrical Energy Audit"
                    ? "border-l-amber-500 hover:border-l-amber-600"
                    : facility.audit_type === "Electrical Safety Audit"
                    ? "border-l-rose-500 hover:border-l-rose-600"
                    : facility.audit_type === "Thermal Audit"
                    ? "border-l-orange-500 hover:border-l-orange-600"
                    : facility.audit_type === "Lightning Arrester Audit"
                    ? "border-l-sky-500 hover:border-l-sky-600"
                    : "border-l-primary hover:border-l-primary/80"
                )}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-secondary/50 px-2 py-0.5 rounded truncate max-w-[140px] inline-block shrink-0" title={facility.audit_type}>
                      {facility.audit_type || "No Audit Type"}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          isClosed
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}
                      >
                        {isClosed ? "Closed" : "Open"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-start gap-2.5 min-w-0">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="truncate text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                        {facility.name}
                      </CardTitle>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[10px] font-mono text-muted-foreground">
                        {facility.audit_number && (
                          <span className="bg-secondary px-1.5 py-0.5 rounded shrink-0">
                            {facility.audit_number}
                          </span>
                        )}
                        {facility.enquiry_number && (
                          <span className="bg-secondary px-1.5 py-0.5 rounded shrink-0">
                            ENQ: {facility.enquiry_number}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground min-w-0">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="block truncate flex-1">
                          {facility.city}
                          {facility.address ? `, ${facility.address}` : ""}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="px-5 py-3 space-y-3 text-xs text-muted-foreground border-y border-muted/20 bg-muted/5 flex-1 min-w-0">
                  {/* {facility.facility_type && (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-foreground min-w-[75px] shrink-0">Type:</span>
                      <span className="block truncate flex-1">{facility.facility_type}</span>
                    </div>
                  )} */}

                  {/* Client Rep info */}
                  {/* <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 text-foreground font-medium min-w-0">
                      <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="block truncate flex-1">{facility.client_representative || "No Representative"}</span>
                    </div>
                    {(facility.client_contact_number || facility.client_email) && (
                      <div className="pl-[22px] space-y-0.5 text-[11px] min-w-0">
                        {facility.client_contact_number && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Phone className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span className="block truncate flex-1">{facility.client_contact_number}</span>
                          </div>
                        )}
                        {facility.client_email && (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail className="h-3 w-3 text-muted-foreground/70 shrink-0" />
                            <span className="block truncate flex-1">{facility.client_email}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div> */}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dashed border-muted/50 text-[11px] min-w-0">
                    <div className="min-w-0">
                      <span className="block text-[10px] text-muted-foreground/70 uppercase truncate">Start Date</span>
                      <div className="flex items-center gap-1 mt-0.5 text-foreground min-w-0">
                        <Calendar className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                        <span className="block truncate flex-1">{facility.start_date ? new Date(facility.start_date).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <span className="block text-[10px] text-muted-foreground/70 uppercase truncate">Target Closure</span>
                      <div className="flex items-center gap-1 mt-0.5 text-foreground min-w-0">
                        <Calendar className="h-3 w-3 text-muted-foreground/80 shrink-0" />
                        <span className="block truncate flex-1">{facility.closure_date ? new Date(facility.closure_date).toLocaleDateString() : "—"}</span>
                      </div>
                    </div>
                  </div>

                  {supportsFacilityUtilityProgress(facility.audit_type) ? (
                    <div
                      className="pt-2 border-t border-dashed border-muted/50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {utilityProgressLoading ? (
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3 w-28" />
                            <Skeleton className="h-3 w-36" />
                          </div>
                        </div>
                      ) : utilityProgressByFacilityId[facility._id] ? (
                        <FacilityUtilityAuditProgress
                          size={36}
                          strokeWidth={3}
                          summary={utilityProgressByFacilityId[facility._id]}
                        />
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>

                <CardFooter className="p-4 flex items-center justify-between gap-2">
                  <div className="flex items-center text-xs font-semibold text-primary group-hover:underline">
                    <span>View Details</span>
                    <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
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
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    {canDeleteFacility ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isDeleting}
                        title="Delete Facility"
                        onClick={(e) => handleDeleteFacility(e, facility)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    ) : null}
                  </div>
                </CardFooter>
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
