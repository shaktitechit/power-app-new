"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/portal/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/portal/ui/dialog";
import { cn } from "@/components/portal/lib/utils";
import { Download, FileSpreadsheet, X, CheckCircle2 } from "lucide-react";
import type { Facility } from "@/store/slices/facilityApiSlice";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";

// Load all required queries
import { useGetUtilityTariffsQuery } from "@/store/slices/electrical-audit/utilityTariffApiSlice";
import { useGetUtilityBillingRecordsQuery } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import { useGetSolarGenerationRecordsQuery } from "@/store/slices/electrical-audit/solarGenerationRecordApiSlice";
import { useGetSolarPlantsQuery } from "@/store/slices/electrical-audit/solarPlantApiSlice";
import { useGetDGSetsQuery } from "@/store/slices/electrical-audit/dgSetApiSlice";
import { useGetDGAuditRecordsQuery } from "@/store/slices/electrical-audit/dgAuditRecordApiSlice";
import { useGetTransformersQuery } from "@/store/slices/electrical-audit/transformerApiSlice";
import { useGetTransformerAuditRecordsQuery } from "@/store/slices/electrical-audit/transformerAuditRecordApiSlice";
import { useGetPumpsQuery } from "@/store/slices/electrical-audit/pumpApiSlice";
import { useGetPumpAuditRecordsQuery } from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";
import { useGetHVACAuditsQuery } from "@/store/slices/electrical-audit/hvacAuditApiSlice";
import { useGetACAuditRecordsQuery } from "@/store/slices/electrical-audit/acAuditRecordApiSlice";
import { useGetLightingAuditsQuery } from "@/store/slices/electrical-audit/lightingAuditApiSlice";
import { useGetStreetLightAuditsQuery } from "@/store/slices/electrical-audit/streetLightAuditApiSlice";
import { useGetFanAuditRecordsQuery } from "@/store/slices/electrical-audit/fanAuditRecordApiSlice";
import { useGetLuxMeasurementsQuery } from "@/store/slices/electrical-audit/luxMeasurementApiSlice";
import { useGetUPSAuditsQuery } from "@/store/slices/electrical-audit/upsAuditApiSlice";
import { useGetMiscLoadAuditsQuery } from "@/store/slices/electrical-audit/miscLoadAuditApiSlice";

import {
  buildUtilityAuditPreviewSheetTabs,
  exportPreviewTabToCsv,
} from "@/components/portal/lib/electrical-audit/utility-audit-preview-sheet";
import { GoogleSheetGrid } from "@/components/portal/shared/components/google-sheet-grid";
import {
  isDataSheetSectionIncludedForStep,
  UTILITY_AUDIT_STEP_IDS,
} from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import type { EnergyAuditRecordCompletionContext } from "@/components/portal/lib/electrical-audit/utility-audit-section-completion";
import { SafetyUtilityAccountPreviewContent } from "./safety-utility-account-preview-content";

function isFacilitySpreadsheetPreviewAudit(auditType: string | undefined): boolean {
  return (
    auditType === "Electrical Energy Audit" ||
    auditType === "Electrical Safety Audit"
  );
}

function facilityPreviewSubtitle(auditType: string | undefined): string {
  if (auditType === "Electrical Safety Audit") {
    return "Read-only preview of safety checklist records and items. Select a utility account sheet to view.";
  }
  return "Read-only preview of all utility accounts data sheets. Select an account sheet to view.";
}

interface AuditPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  facility: Facility;
  utilityAccounts?: UtilityAccount[];
  facilityAuditClosed: boolean;
  utilityAccountsCount: number;
  utilityAuditCompletedCount: number;
  utilityAuditPendingCount: number;
  canCloseFacilityAudit: boolean;
  canCloseFacilityAuditAction: boolean;
  closingFacilityAudit: boolean;
  onCloseAudit: () => void;
}

function formatTabRowCount(tab: {
  rowCount: number;
  sections: { rows: { length: number }; columns: { key: string }[] }[];
}) {
  if (tab.rowCount > 0) {
    return String(tab.rowCount);
  }

  const hasOnlyEmptyMessages = tab.sections.every(
    (section) =>
      section.rows.length === 1 && section.columns[0]?.key === "message",
  );
  return hasOnlyEmptyMessages ? "0" : String(tab.rowCount);
}

interface UtilityAccountPreviewContentProps {
  facilityId: string;
  utilityAccount: UtilityAccount;
}

function UtilityAccountPreviewContent({
  facilityId,
  utilityAccount,
}: UtilityAccountPreviewContentProps) {
  const utilityAccountId = utilityAccount._id;

  const auditor = utilityAccount.auditor_id as any;
  const auditorName = typeof auditor === "object" && auditor ? auditor.name : undefined;

  const isStepIncluded = useCallback(
    (step: string) => isDataSheetSectionIncludedForStep(utilityAccount, step),
    [utilityAccount]
  );

  const { data: tariffData } = useGetUtilityTariffsQuery(
    { utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.TARIFF) },
  );
  const { data: billingData } = useGetUtilityBillingRecordsQuery(
    { utility_account_id: utilityAccountId },
    {
      skip:
        !utilityAccountId ||
        (!isStepIncluded(UTILITY_AUDIT_STEP_IDS.BILLING) &&
          !isStepIncluded(UTILITY_AUDIT_STEP_IDS.SOLAR)),
    },
  );
  const entityQueryParams = {
    utility_account_id: utilityAccountId,
    facility_id: facilityId,
  };
  const { data: solarPlantsData } = useGetSolarPlantsQuery(entityQueryParams, {
    skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.SOLAR),
  });
  const { data: solarGenData } = useGetSolarGenerationRecordsQuery(
    { utility_account_id: utilityAccountId, facility_id: facilityId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.SOLAR) },
  );
  const { data: dgSetsData } = useGetDGSetsQuery(entityQueryParams, {
    skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.DG),
  });
  const { data: dgAuditData } = useGetDGAuditRecordsQuery(
    { utility_account_id: utilityAccountId, facility_id: facilityId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.DG) },
  );
  const { data: transformersData } = useGetTransformersQuery(entityQueryParams, {
    skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.TRANSFORMER),
  });
  const { data: transformerAuditData } = useGetTransformerAuditRecordsQuery(
    { utility_account_id: utilityAccountId, facility_id: facilityId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.TRANSFORMER) },
  );
  const { data: pumpsData } = useGetPumpsQuery(entityQueryParams, {
    skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.PUMP),
  });
  const { data: pumpAuditData } = useGetPumpAuditRecordsQuery(
    { utility_account_id: utilityAccountId, facility_id: facilityId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.PUMP) },
  );
  const { data: hvacData } = useGetHVACAuditsQuery(
    { facility_id: facilityId, utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.HVAC) },
  );
  const { data: acData } = useGetACAuditRecordsQuery(
    { facility_id: facilityId, utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.AC) },
  );
  const { data: lightingData } = useGetLightingAuditsQuery(
    { facility_id: facilityId, utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.LIGHTING) },
  );
  const { data: streetLightData } = useGetStreetLightAuditsQuery(
    { facility_id: facilityId, utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.STREET_LIGHT) },
  );
  const { data: fanData } = useGetFanAuditRecordsQuery(
    { facility_id: facilityId, utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.FAN) },
  );
  const { data: luxData } = useGetLuxMeasurementsQuery(
    { facility_id: facilityId, utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.LUX) },
  );
  const { data: upsData } = useGetUPSAuditsQuery(
    { facility_id: facilityId, utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.UPS) },
  );
  const { data: miscData } = useGetMiscLoadAuditsQuery(
    { facility_id: facilityId, utility_account_id: utilityAccountId },
    { skip: !utilityAccountId || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.MISC) },
  );

  const solarPlants = useMemo(() => solarPlantsData?.data ?? [], [solarPlantsData]);
  const solarGenRecords = useMemo(() => solarGenData?.data ?? [], [solarGenData]);
  const dgSets = useMemo(() => dgSetsData?.data ?? [], [dgSetsData]);
  const dgAuditRecords = useMemo(() => dgAuditData?.data ?? [], [dgAuditData]);
  const transformers = useMemo(() => transformersData?.data ?? [], [transformersData]);
  const transformerAuditRecords = useMemo(() => transformerAuditData?.data ?? [], [transformerAuditData]);
  const pumps = useMemo(() => pumpsData?.data ?? [], [pumpsData]);
  const pumpAuditRecords = useMemo(() => pumpAuditData?.data ?? [], [pumpAuditData]);

  const recordCompletionContext = useMemo<EnergyAuditRecordCompletionContext>(
    () => ({
      tariffs: tariffData?.data,
      billingRecords: billingData?.data,
      hvacRecords: hvacData?.data,
      acRecords: acData?.data,
      lightingRecords: lightingData?.data,
      streetLightRecords: streetLightData?.data,
      fanRecords: fanData?.data,
      luxRecords: luxData?.data,
      upsRecords: upsData?.data,
      miscRecords: miscData?.data,
      solarPlants,
      solarGenerationRecords: solarGenRecords,
      dgSets,
      dgAuditRecords,
      transformers,
      transformerAuditRecords,
      pumps,
      pumpAuditRecords,
    }),
    [
      tariffData?.data,
      billingData?.data,
      hvacData?.data,
      acData?.data,
      lightingData?.data,
      streetLightData?.data,
      fanData?.data,
      luxData?.data,
      upsData?.data,
      miscData?.data,
      solarPlants,
      solarGenRecords,
      dgSets,
      dgAuditRecords,
      transformers,
      transformerAuditRecords,
      pumps,
      pumpAuditRecords,
    ],
  );

  const includedStepIds = useMemo(() => {
    return Object.values(UTILITY_AUDIT_STEP_IDS).filter(
      (stepId) =>
        stepId !== UTILITY_AUDIT_STEP_IDS.PREVIEW_SUBMIT &&
        isStepIncluded(stepId)
    );
  }, [isStepIncluded]);

  const previewSheetTabs = useMemo(
    () => buildUtilityAuditPreviewSheetTabs(includedStepIds, recordCompletionContext),
    [includedStepIds, recordCompletionContext]
  );

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const activePreviewTab =
    previewSheetTabs.find((tab) => tab.stepId === selectedStepId) ??
    previewSheetTabs[0] ??
    null;

  useEffect(() => {
    if (!previewSheetTabs.length) return;
    const hasSelectedTab = previewSheetTabs.some((tab) => tab.stepId === selectedStepId);
    if (!hasSelectedTab) {
      setSelectedStepId(previewSheetTabs[0].stepId);
    }
  }, [previewSheetTabs, selectedStepId]);

  const handleExportActiveTab = () => {
    if (!activePreviewTab) return;
    const safeLabel = activePreviewTab.label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    exportPreviewTabToCsv(
      activePreviewTab,
      `facility-audit-${utilityAccount.account_number}-${safeLabel}`
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Workflow steps selection */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {previewSheetTabs.map((tab) => (
              <button
                key={tab.stepId}
                type="button"
                onClick={() => setSelectedStepId(tab.stepId)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  activePreviewTab?.stepId === tab.stepId
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                <span className="ml-1.5 text-[10px] font-normal text-muted-foreground">
                  ({formatTabRowCount(tab)})
                </span>
              </button>
            ))}
          </div>
          {auditorName && (
            <span className="text-xs font-normal px-2 py-1 rounded bg-muted border border-border text-muted-foreground">
              Auditor: {auditorName}
            </span>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          disabled={!activePreviewTab}
          onClick={handleExportActiveTab}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Main Preview Grid */}
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {previewSheetTabs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            No included audit sections to preview yet.
          </div>
        ) : activePreviewTab ? (
          activePreviewTab.sections.map((section) => (
            <section
              key={section.id}
              className="flex min-h-[300px] flex-col flex-1"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {section.title}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {section.rows.length === 1 &&
                  section.columns[0]?.key === "message"
                    ? "No records"
                    : `${section.rows.length} record${section.rows.length === 1 ? "" : "s"}`}
                </span>
              </div>
              <GoogleSheetGrid
                fillHeight
                columns={section.columns}
                rows={section.rows}
                emptyMessage={`No records in ${section.title}.`}
                className="min-h-[200px]"
              />
            </section>
          ))
        ) : null}
      </main>
    </div>
  );
}

export function AuditPreviewModal({
  open,
  onOpenChange,
  facility,
  utilityAccounts = [],
  facilityAuditClosed,
  utilityAccountsCount,
  utilityAuditCompletedCount,
  utilityAuditPendingCount,
  canCloseFacilityAudit,
  canCloseFacilityAuditAction,
  closingFacilityAudit,
  onCloseAudit,
}: AuditPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    if (!isFacilitySpreadsheetPreviewAudit(facility.audit_type)) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open, facility.audit_type]);

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  const selectedUtilityAccount = useMemo(() => {
    return (
      utilityAccounts.find((u) => u._id === selectedAccountId) ??
      utilityAccounts[0] ??
      null
    );
  }, [utilityAccounts, selectedAccountId]);

  useEffect(() => {
    if (utilityAccounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(utilityAccounts[0]._id);
    }
  }, [utilityAccounts, selectedAccountId]);

  const isSpreadsheetPreviewAudit = isFacilitySpreadsheetPreviewAudit(
    facility.audit_type,
  );
  const isElectricalSafetyAudit =
    facility.audit_type === "Electrical Safety Audit";

  const statusMessage = facilityAuditClosed
    ? "Facility audit is currently closed."
    : utilityAccountsCount === 0
      ? "No utility accounts configured. You can close the facility audit now."
      : !canCloseFacilityAudit
        ? `${utilityAuditPendingCount} utility audit${utilityAuditPendingCount === 1 ? "" : "s"} still pending. Complete all utility account audits to enable facility audit closure.`
        : "All utility audits are completed. You can close the facility audit now.";

  if (isSpreadsheetPreviewAudit) {
    if (!open) return null;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background text-foreground">
        {/* Header */}
        <header className="flex shrink-0 items-center justify-between border-b border-border bg-muted/30 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold">
                Facility Audit Preview — {facility.name}
              </h2>
              <p className="text-xs text-muted-foreground">
                {facilityPreviewSubtitle(facility.audit_type)}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Sheets switcher tab list */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-muted/10 px-4 py-2 sm:px-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Utility Sheets:
          </span>
          <div className="flex flex-wrap gap-1">
            {utilityAccounts.map((account) => (
              <button
                key={account._id}
                type="button"
                onClick={() => setSelectedAccountId(account._id)}
                className={cn(
                  "rounded-md border px-3 py-1 text-xs font-semibold transition",
                  selectedUtilityAccount?._id === account._id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {account.account_number}
              </button>
            ))}
            {utilityAccounts.length === 0 && (
              <span className="text-xs italic text-muted-foreground">
                No utility accounts configured
              </span>
            )}
          </div>
        </div>

        {/* Active Account Spreadsheet Tabs & Grid */}
        {selectedUtilityAccount ? (
          isElectricalSafetyAudit ? (
            <SafetyUtilityAccountPreviewContent
              facilityId={facility._id}
              utilityAccount={selectedUtilityAccount}
            />
          ) : (
            <UtilityAccountPreviewContent
              facilityId={facility._id}
              utilityAccount={selectedUtilityAccount}
            />
          )
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            No utility account selected.
          </div>
        )}

        {/* Footer */}
        <footer className="shrink-0 border-t border-border bg-muted/20 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-muted-foreground md:text-sm">
              <span className="mr-1 block font-semibold text-foreground md:inline">
                Closure Status:
              </span>
              {statusMessage}
            </div>

            <div className="flex items-center gap-3 self-end md:self-auto">
              <Button
                onClick={onCloseAudit}
                disabled={
                  facilityAuditClosed ||
                  !canCloseFacilityAuditAction ||
                  !canCloseFacilityAudit ||
                  closingFacilityAudit
                }
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                {closingFacilityAudit ? "Closing..." : "Close Facility Audit"}
              </Button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Other audit types: simple closure dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Audit Preview & Closure</DialogTitle>
          <DialogDescription>{statusMessage}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Facility
            </p>
            <p className="mt-1 font-medium text-foreground">{facility.name}</p>
            <p className="text-sm text-muted-foreground">{facility.city}</p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Audit Progress
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {utilityAuditCompletedCount}/{utilityAccountsCount}
            </p>
            <p className="text-sm text-muted-foreground">
              utility account audits completed
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground">Closure status</span>
            <span
              className={`font-medium ${
                facilityAuditClosed
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-amber-700 dark:text-amber-400"
              }`}
            >
              {facilityAuditClosed ? "Closed" : "Open"}
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            onClick={onCloseAudit}
            disabled={
              facilityAuditClosed ||
              !canCloseFacilityAuditAction ||
              !canCloseFacilityAudit ||
              closingFacilityAudit
            }
          >
            {closingFacilityAudit ? "Closing..." : "Close Audit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
