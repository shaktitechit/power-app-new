"use client";

import {
  canManageResource,
  canViewFacilityManagementTabs,
  canDeleteAuditRecords,
} from "@/components/portal/lib/authRoles";
import { useEffect, useMemo, useState, useRef, type ComponentProps } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useParams } from "@/components/portal/hooks/useParams";
import Link from "next/link";
import { DashboardLayout } from "@/components/portal/layout/dashboard-layout";
import { CustomTabs } from "@/components/portal/ui/custom-tabs";
import { Button } from "@/components/portal/ui/button";
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
import { AddUtilityAccountForm } from "@/components/portal/shared/components/electrical-audit/connection/create-utility-form";
import { BulkCreateUtilityForm } from "@/components/portal/shared/components/electrical-audit/connection/bulk-create-utility-form";
import { EditUtilityAccountForm } from "@/components/portal/shared/components/electrical-audit/connection/edit-utility-form";
import { CreateSafetyAuditUtilityForm } from "@/components/portal/shared/components/safety-audit/utility-account/create-safety-audit-utility-form";
import { EditSafetyAuditUtilityForm } from "@/components/portal/shared/components/safety-audit/utility-account/edit-safety-audit-utility-form";
import { EditFacilityForm } from "@/components/portal/shared/components/facility/edit-facility-form";
import { EditBudgetForm } from "@/components/portal/shared/components/facility/edit-budget-form";
import { EditDocumentsForm } from "@/components/portal/shared/components/facility/edit-documents-form";
import { ArrowLeft, ClipboardCheck, Pencil } from "lucide-react";
import {
  useCloseFacilityAuditMutation,
  useGetFacilityByIdQuery,
  useOpenFacilityAuditMutation,
} from "@/store/slices/facilityApiSlice";
import {
  type UtilityAccount,
  useDeleteUtilityAccountMutation,
  useGetUtilityAccountsQuery,
} from "@/store/slices/electrical-audit/utilityApiSlice";
import { useAppSelector } from "@/store/hooks";
import { toastHandler } from "@/components/portal/lib/toast";
import {
  AUDIT_TYPE_SLUG,
  facilityUtilityPath,
  isUtilityAccountComingSoonSlug,
  isUtilityAccountWorkspaceSupportedSlug,
} from "@/components/portal/lib/facilityRoutes";
import { BudgetInformationTab } from "./_components/budget-information-tab";
import { ContactInformationTab } from "./_components/contact-information-tab";
import { FacilityInformationTab } from "./_components/facility-information-tab";
import {
  UTILITY_ACCOUNTS_PAGE_SIZE,
  isUtilityAccountAuditComplete,
  matchesUtilityAccountStatusFilter,
  type UtilityAccountStatusFilter,
  utilityAccountSearchHaystack,
} from "./_components/facility-utils";
import { ImagesDocumentsTab } from "./_components/images-documents-tab";
import { AuditPreviewModal } from "./_components/audit-preview-modal";
import { UtilityAccountsTab } from "./_components/utility-accounts-tab";
import { FacilityUtilityAuditProgress } from "./_components/facility-utility-audit-progress";

const FACILITY_TABS = [
  { id: "utility_accounts", label: "Utility Accounts" },
  { id: "facility_information", label: "Facility Information" },
  { id: "contact_information", label: "Contact Information" },
  { id: "budget_information", label: "Budget Information" },
  { id: "images_documents", label: "Images & Documents" },
] as const;

type FacilityTabId = (typeof FACILITY_TABS)[number]["id"];

const LEGACY_TAB_MAP: Record<string, FacilityTabId> = {
  overview: "facility_information",
  utility_accounts: "utility_accounts",
};

const MANAGER_VISIBLE_TAB_IDS = new Set<FacilityTabId>([
  "facility_information",
  "contact_information",
]);

const ADMIN_ONLY_TAB_IDS = new Set<FacilityTabId>([
  "budget_information",
  "images_documents",
]);

function isTabVisible(
  tabId: FacilityTabId,
  canViewManagementTabs: boolean,
  isFacilityAdmin: boolean,
): boolean {
  if (tabId === "utility_accounts") return true;
  if (ADMIN_ONLY_TAB_IDS.has(tabId)) return isFacilityAdmin;
  if (MANAGER_VISIBLE_TAB_IDS.has(tabId)) return canViewManagementTabs;
  return false;
}

function resolveTab(
  tab: string | null,
  canViewManagementTabs: boolean,
  isFacilityAdmin: boolean,
): FacilityTabId {
  if (tab && tab in LEGACY_TAB_MAP) {
    const mapped = LEGACY_TAB_MAP[tab];
    return isTabVisible(mapped, canViewManagementTabs, isFacilityAdmin)
      ? mapped
      : "utility_accounts";
  }
  if (tab && FACILITY_TABS.some((t) => t.id === tab)) {
    const tabId = tab as FacilityTabId;
    return isTabVisible(tabId, canViewManagementTabs, isFacilityAdmin)
      ? tabId
      : "utility_accounts";
  }
  return "utility_accounts";
}

export default function FacilityWorkspacePage() {
  type EditUtilityAccountValue = ComponentProps<
    typeof EditUtilityAccountForm
  >["utilityAccount"];

  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const facilityId = params.facilityId as string;
  const auditTypeSlug = (params.auditType as string) || "";
  const isElectricalEnergyAuditRoute =
    auditTypeSlug === AUDIT_TYPE_SLUG.ELECTRICAL_ENERGY;
  const isElectricalSafetyAuditRoute =
    auditTypeSlug === AUDIT_TYPE_SLUG.ELECTRICAL_SAFETY;
  const isUtilityAccountWorkspaceRoute =
    isUtilityAccountWorkspaceSupportedSlug(auditTypeSlug);
  const isUtilityAccountComingSoonRoute =
    isUtilityAccountComingSoonSlug(auditTypeSlug);

  const [editOpen, setEditOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dynHeight, setDynHeight] = useState<string>("calc(100vh - 12rem)");

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const top = containerRef.current.getBoundingClientRect().top;
        const remaining = window.innerHeight - top - 16; // minus 16px padding
        setDynHeight(`${Math.max(remaining, 300)}px`);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    
    // Watch body size for any layout shifts
    const observer = new ResizeObserver(updateHeight);
    if (document.body) observer.observe(document.body);

    const timer = setTimeout(updateHeight, 150);
    return () => {
      window.removeEventListener("resize", updateHeight);
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);
  const [editFacilityOpen, setEditFacilityOpen] = useState(false);
  const [editFacilityInitialStep, setEditFacilityInitialStep] = useState<1 | 2 | 3>(1);
  const [editBudgetOpen, setEditBudgetOpen] = useState(false);
  const [editDocumentsOpen, setEditDocumentsOpen] = useState(false);
  const [selectedUtilityAccount, setSelectedUtilityAccount] =
    useState<EditUtilityAccountValue>(null);
  const [isConnectionWizardOpen, setIsConnectionWizardOpen] = useState(false);
  const [isBulkUtilityWizardOpen, setIsBulkUtilityWizardOpen] = useState(false);
  const [closeAuditDialogOpen, setCloseAuditDialogOpen] = useState(false);
  const [auditPreviewOpen, setAuditPreviewOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTargetUtility, setDeleteTargetUtility] =
    useState<UtilityAccount | null>(null);
  const [utilitySearchQuery, setUtilitySearchQuery] = useState("");
  const [utilityStatusFilter, setUtilityStatusFilter] =
    useState<UtilityAccountStatusFilter>("all");
  const [utilityPage, setUtilityPage] = useState(1);

  const [deleteUtilityAccount] = useDeleteUtilityAccountMutation();
  const [closeFacilityAudit, { isLoading: closingFacilityAudit }] =
    useCloseFacilityAuditMutation();
  const [openFacilityAudit, { isLoading: openingFacilityAudit }] =
    useOpenFacilityAuditMutation();

  const user = useAppSelector((state) => state.auth.user);
  const isFacilityAdmin =
    user?.role === "super_admin" || user?.role === "admin";
  const canViewManagementTabs = canViewFacilityManagementTabs(user?.role);
  const canUpdateFacility = isFacilityAdmin;
  const canCloseFacilityAuditAction = canManageResource(
    user?.role,
    user?.permissions || [],
    "facility",
    "close_facility_audit",
  );
  const canReopenFacilityAudit = canManageResource(
    user?.role,
    user?.permissions || [],
    "facility",
    "reopen_facility_audit",
  );
  const canCreateUtilityAccount = canManageResource(
    user?.role,
    user?.permissions || [],
    "utility_account",
    "create",
  );
  const canUpdateUtilityAccount = canManageResource(
    user?.role,
    user?.permissions || [],
    "utility_account",
    "update",
  );
  const canDeleteUtilityAccount = canDeleteAuditRecords(user?.role);

  const { data: utilities, isLoading: utilitiesLoading } =
    useGetUtilityAccountsQuery({
      facility_id: facilityId,
    });

  const utilityAccounts = utilities?.data || [];

  const filteredUtilityAccounts = useMemo(() => {
    const q = utilitySearchQuery.trim().toLowerCase();
    return utilityAccounts.filter((u) => {
      if (!matchesUtilityAccountStatusFilter(u, utilityStatusFilter)) {
        return false;
      }
      if (!q) return true;
      return utilityAccountSearchHaystack(u).includes(q);
    });
  }, [utilityAccounts, utilitySearchQuery, utilityStatusFilter]);

  const utilityTotalFiltered = filteredUtilityAccounts.length;
  const utilityTotalPages =
    utilityTotalFiltered === 0
      ? 1
      : Math.ceil(utilityTotalFiltered / UTILITY_ACCOUNTS_PAGE_SIZE);

  const paginatedUtilityAccounts = useMemo(() => {
    const start = (utilityPage - 1) * UTILITY_ACCOUNTS_PAGE_SIZE;
    return filteredUtilityAccounts.slice(start, start + UTILITY_ACCOUNTS_PAGE_SIZE);
  }, [filteredUtilityAccounts, utilityPage]);

  useEffect(() => {
    setUtilityPage(1);
  }, [utilitySearchQuery, utilityStatusFilter]);

  useEffect(() => {
    setUtilityPage((p) => Math.min(p, utilityTotalPages));
  }, [utilityTotalPages]);

  useEffect(() => {
    setUtilitySearchQuery("");
    setUtilityStatusFilter("all");
    setUtilityPage(1);
  }, [facilityId]);

  const utilityAuditCompletedCount = utilityAccounts.filter((utility) =>
    isUtilityAccountAuditComplete(utility),
  ).length;
  const utilityAuditPendingCount = Math.max(
    utilityAccounts.length - utilityAuditCompletedCount,
    0,
  );
  const canCloseFacilityAudit =
    utilityAccounts.length === 0 ||
    utilityAuditCompletedCount === utilityAccounts.length;

  const { data, refetch: refetchFacility } = useGetFacilityByIdQuery(facilityId);

  const facility = data?.data?.facility;
  const facilityAuditClosed = Boolean(facility?.audit_closure?.closed_at);
  const assignedAuditors = data?.data?.assignedAuditors ?? [];
  const clientRepresentatives =
    facility?.client_representatives && facility.client_representatives.length > 0
      ? facility.client_representatives
      : [
          {
            name: facility?.client_representative || "",
            contact_number: facility?.client_contact_number || "",
            email: facility?.client_email || "",
          },
        ].filter((rep) => rep.name || rep.contact_number || rep.email);

  const tabs = useMemo(
    () =>
      FACILITY_TABS.filter((tab) =>
        isTabVisible(tab.id, canViewManagementTabs, isFacilityAdmin),
      ).map((tab) =>
        tab.id === "utility_accounts"
          ? { ...tab, count: utilityAccounts.length }
          : tab.id === "images_documents"
            ? { ...tab, count: facility?.documents?.length || 0 }
            : tab,
      ),
    [
      utilityAccounts.length,
      facility?.documents?.length,
      canViewManagementTabs,
      isFacilityAdmin,
    ],
  );

  const tabGridClassName = useMemo(() => {
    const count = tabs.length;
    if (count <= 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-2";
    if (count === 3) return "grid-cols-2 sm:grid-cols-3";
    if (count === 4) return "grid-cols-2 sm:grid-cols-4";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5";
  }, [tabs.length]);

  const [activeTab, setActiveTab] = useState<FacilityTabId>(() =>
    resolveTab(searchParams.get("tab"), canViewManagementTabs, isFacilityAdmin),
  );

  useEffect(() => {
    const urlTabParam = searchParams.get("tab");
    const urlTab = resolveTab(
      urlTabParam,
      canViewManagementTabs,
      isFacilityAdmin,
    );

    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }

    if (urlTabParam !== urlTab) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("tab", urlTab);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    }
  }, [
    searchParams,
    activeTab,
    canViewManagementTabs,
    isFacilityAdmin,
    pathname,
    router,
  ]);

  const handleTabChange = (tabId: string) => {
    const validTab = resolveTab(tabId, canViewManagementTabs, isFacilityAdmin);
    setActiveTab(validTab);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", validTab);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  };

  const handleEditUtilityAccount = (
    e: React.MouseEvent<HTMLButtonElement>,
    utilityAccount: UtilityAccount,
  ) => {
    e.stopPropagation();
    if (!canUpdateUtilityAccount) return;
    setSelectedUtilityAccount({
      ...utilityAccount,
      facility_id:
        typeof utilityAccount.facility_id === "string"
          ? utilityAccount.facility_id
          : utilityAccount.facility_id?._id,
    });
    setEditOpen(true);
  };

  const handleDeleteUtilityAccount = (
    e: React.MouseEvent<HTMLButtonElement>,
    utilityAccount: UtilityAccount,
  ) => {
    e.stopPropagation();
    if (!canDeleteUtilityAccount) return;
    setDeleteTargetUtility(utilityAccount);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUtilityAccount = async () => {
    if (!deleteTargetUtility?._id) return;
    try {
      await deleteUtilityAccount(deleteTargetUtility._id).unwrap();
      setDeleteDialogOpen(false);
      setDeleteTargetUtility(null);
    } catch (error) {
      console.error("Failed to delete utility account:", error);
    }
  };

  if (!facility) {
    return (
      <DashboardLayout title="Loading Facility...">
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">
            The requested facility was not found.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => router.push("/facilities")}
          >
            Back to Facilities
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const handleConnectionClick = (utilityAccount: UtilityAccount) => {
    router.push(
      facilityUtilityPath(facility?.audit_type, facilityId, utilityAccount._id),
    );
  };

  const handleEditComplete = async () => {
    setEditOpen(false);
    setSelectedUtilityAccount(null);
  };

  const openEditFacility = (step: 1 | 2 | 3 = 1) => {
    setEditFacilityInitialStep(step);
    setEditFacilityOpen(true);
  };

  const handleEditFacilityComplete = () => {
    setEditFacilityOpen(false);
    refetchFacility();
  };

  const handleCloseFacilityAudit = async () => {
    if (!facilityId || !canCloseFacilityAuditAction || !canCloseFacilityAudit)
      return;
    setCloseAuditDialogOpen(false);
    await toastHandler({
      action: () => closeFacilityAudit(facilityId).unwrap(),
      loading: "Closing facility audit...",
      success: "Facility audit closed successfully",
    });
  };

  const handleOpenFacilityAudit = async () => {
    if (!facilityId) return;
    await toastHandler({
      action: () => openFacilityAudit(facilityId).unwrap(),
      loading: "Opening facility audit...",
      success: "Facility audit opened successfully",
    });
  };

  return (
    <DashboardLayout title={facility.name} subtitle={`${facility.city}`}>
      <div
        ref={containerRef}
        style={{ height: dynHeight }}
        className="-mx-4 -mb-4 flex flex-col overflow-hidden sm:-mx-6 sm:-mb-6"
      >
        <div className="shrink-0 border-b border-border px-4 pb-4 sm:px-6">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href="/facilities"
              className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="truncate">Back to Facilities</span>
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              {isUtilityAccountWorkspaceRoute && utilityAccounts.length > 0 ? (
                <FacilityUtilityAuditProgress utilityAccounts={utilityAccounts} />
              ) : null}
              {isFacilityAdmin ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuditPreviewOpen(true)}
                  disabled={facilityAuditClosed}
                  title={
                    facilityAuditClosed
                      ? "Facility audit is closed; preview is disabled."
                      : "Preview & Closure"
                  }
                >
                  <ClipboardCheck className="mr-1 h-4 w-4" />
                  Preview & Closure
                </Button>
              ) : null}
              {facilityAuditClosed && canReopenFacilityAudit ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleOpenFacilityAudit}
                  disabled={openingFacilityAudit || closingFacilityAudit}
                >
                  {openingFacilityAudit ? "Opening..." : "Re-open Audit"}
                </Button>
              ) : null}
              {canUpdateFacility ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={facilityAuditClosed}
                  title={
                    facilityAuditClosed
                      ? "Facility audit is closed; editing is locked."
                      : "Edit Facility"
                  }
                  onClick={() => openEditFacility(1)}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit Facility
                </Button>
              ) : null}
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  facilityAuditClosed
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                }`}
              >
                {facilityAuditClosed ? "Closed" : "Open"}
              </span>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-6">
          {activeTab === "utility_accounts" ? (
            <UtilityAccountsTab
              facilityAuditClosed={facilityAuditClosed}
              isUtilityAccountComingSoonRoute={isUtilityAccountComingSoonRoute}
              isUtilityAccountWorkspaceRoute={isUtilityAccountWorkspaceRoute}
              utilitiesLoading={utilitiesLoading}
              utilityAccounts={utilityAccounts}
              paginatedUtilityAccounts={paginatedUtilityAccounts}
              utilitySearchQuery={utilitySearchQuery}
              utilityStatusFilter={utilityStatusFilter}
              onUtilityStatusFilterChange={setUtilityStatusFilter}
              utilityPage={utilityPage}
              utilityTotalFiltered={utilityTotalFiltered}
              utilityTotalPages={utilityTotalPages}
              canCreateUtilityAccount={canCreateUtilityAccount}
              canUpdateUtilityAccount={canUpdateUtilityAccount}
              canDeleteUtilityAccount={canDeleteUtilityAccount}
              onUtilitySearchChange={setUtilitySearchQuery}
              onUtilityPageChange={setUtilityPage}
              onAddUtilityAccount={() => setIsConnectionWizardOpen(true)}
              onBulkAddUtilityAccounts={() => setIsBulkUtilityWizardOpen(true)}
              onEditUtilityAccount={handleEditUtilityAccount}
              onDeleteUtilityAccount={handleDeleteUtilityAccount}
              onConnectionClick={handleConnectionClick}
            />
          ) : null}

          {activeTab === "facility_information" && canViewManagementTabs ? (
            <FacilityInformationTab
              facility={facility}
              assignedAuditors={assignedAuditors}
              facilityAuditClosed={facilityAuditClosed}
              canUpdateFacility={canUpdateFacility}
              onEdit={() => openEditFacility(1)}
            />
          ) : null}

          {activeTab === "contact_information" && canViewManagementTabs ? (
            <ContactInformationTab
              clientRepresentatives={clientRepresentatives}
              canUpdateFacility={canUpdateFacility}
              facilityAuditClosed={facilityAuditClosed}
              onEdit={() => openEditFacility(2)}
            />
          ) : null}

          {activeTab === "budget_information" && isFacilityAdmin ? (
            <BudgetInformationTab
              facility={facility}
              canUpdateFacility={canUpdateFacility}
              facilityAuditClosed={facilityAuditClosed}
              onEditBudget={() => setEditBudgetOpen(true)}
            />
          ) : null}

          {activeTab === "images_documents" && isFacilityAdmin ? (
            <ImagesDocumentsTab
              facility={facility}
              canUpdateFacility={canUpdateFacility}
              facilityAuditClosed={facilityAuditClosed}
              onEditDocuments={() => setEditDocumentsOpen(true)}
            />
          ) : null}
        </div>

        <div className="shrink-0 pb-[env(safe-area-inset-bottom,0px)]">
          <CustomTabs
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            position="bottom"
            tabGridClassName={tabGridClassName}
          />
        </div>
      </div>

      {isFacilityAdmin ? (
        <AuditPreviewModal
        open={auditPreviewOpen}
        onOpenChange={setAuditPreviewOpen}
        facility={facility}
        utilityAccounts={utilityAccounts}
        facilityAuditClosed={facilityAuditClosed}
        utilityAccountsCount={utilityAccounts.length}
        utilityAuditCompletedCount={utilityAuditCompletedCount}
        utilityAuditPendingCount={utilityAuditPendingCount}
        canCloseFacilityAudit={canCloseFacilityAudit}
        canCloseFacilityAuditAction={canCloseFacilityAuditAction}
        closingFacilityAudit={closingFacilityAudit}
        onCloseAudit={() => {
          setAuditPreviewOpen(false);
          setCloseAuditDialogOpen(true);
        }}
      />
      ) : null}

      <AlertDialog
        open={closeAuditDialogOpen}
        onOpenChange={setCloseAuditDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Close facility audit?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                You are about to close the audit for{" "}
                <span className="font-medium text-foreground">{facility.name}</span>.
                Utility account data will be locked for editing until an administrator
                re-opens the facility audit.
              </span>
              <span className="block text-amber-800 dark:text-amber-200">
                {utilityAccounts.length === 0
                  ? "No utility accounts exist for this facility. Only continue if you are ready to finalize without utility audit data."
                  : "Only continue if every utility account audit is finished and you are ready to finalize this facility."}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={closingFacilityAudit}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={closingFacilityAudit}
              onClick={() => void handleCloseFacilityAudit()}
            >
              {closingFacilityAudit ? "Closing..." : "Yes, close audit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canCreateUtilityAccount && isElectricalEnergyAuditRoute ? (
        <AddUtilityAccountForm
          open={isConnectionWizardOpen}
          onOpenChange={setIsConnectionWizardOpen}
          onComplete={() => setIsConnectionWizardOpen(false)}
          facilityId={facilityId}
        />
      ) : null}

      {canCreateUtilityAccount && isElectricalEnergyAuditRoute ? (
        <BulkCreateUtilityForm
          open={isBulkUtilityWizardOpen}
          onOpenChange={setIsBulkUtilityWizardOpen}
          onComplete={() => undefined}
          facilityId={facilityId}
          variant="energy"
        />
      ) : null}

      {canCreateUtilityAccount && isElectricalSafetyAuditRoute ? (
        <CreateSafetyAuditUtilityForm
          open={isConnectionWizardOpen}
          onOpenChange={setIsConnectionWizardOpen}
          onComplete={() => setIsConnectionWizardOpen(false)}
          facilityId={facilityId}
        />
      ) : null}

      {canCreateUtilityAccount && isElectricalSafetyAuditRoute ? (
        <BulkCreateUtilityForm
          open={isBulkUtilityWizardOpen}
          onOpenChange={setIsBulkUtilityWizardOpen}
          onComplete={() => undefined}
          facilityId={facilityId}
          variant="safety"
        />
      ) : null}

      {canUpdateUtilityAccount && isElectricalEnergyAuditRoute ? (
        <EditUtilityAccountForm
          open={editOpen}
          onOpenChange={setEditOpen}
          onComplete={handleEditComplete}
          utilityAccount={selectedUtilityAccount}
        />
      ) : null}

      {canUpdateUtilityAccount && isElectricalSafetyAuditRoute ? (
        <EditSafetyAuditUtilityForm
          open={editOpen}
          onOpenChange={setEditOpen}
          onComplete={handleEditComplete}
          utilityAccount={selectedUtilityAccount}
        />
      ) : null}

      <AlertDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open) setDeleteTargetUtility(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete utility account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTargetUtility?.account_number || "this account"}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteUtilityAccount()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {canUpdateFacility ? (
        <EditFacilityForm
          open={editFacilityOpen}
          onOpenChange={setEditFacilityOpen}
          onComplete={handleEditFacilityComplete}
          facilityId={facilityId}
          initialStep={editFacilityInitialStep}
        />
      ) : null}

      {isFacilityAdmin ? (
        <EditBudgetForm
          open={editBudgetOpen}
          onOpenChange={setEditBudgetOpen}
          onComplete={refetchFacility}
          facilityId={facilityId}
        />
      ) : null}

      {isFacilityAdmin ? (
        <EditDocumentsForm
          open={editDocumentsOpen}
          onOpenChange={setEditDocumentsOpen}
          onComplete={refetchFacility}
          facilityId={facilityId}
        />
      ) : null}
    </DashboardLayout>
  );
}
