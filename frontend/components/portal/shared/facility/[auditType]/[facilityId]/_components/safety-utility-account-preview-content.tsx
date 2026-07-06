"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/portal/ui/button";
import { cn } from "@/components/portal/lib/utils";
import { Download } from "lucide-react";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";
import { ELECTRICAL_SAFETY_AUDIT_STEPS } from "@/components/portal/lib/electrical-audit/safety-audit-workflow";
import {
  buildSafetyAuditPreviewSheetTabs,
  exportPreviewTabToCsv,
  isSafetyChecklistPreviewSection,
  type SafetyAuditRecordCompletionContext,
} from "@/components/portal/lib/electrical-audit/safety-audit-preview-sheet";
import { isDataSheetSectionIncludedForStep } from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { GoogleSheetGrid } from "@/components/portal/shared/components/google-sheet-grid";
import { useGetSafetyTransformerAuditsQuery } from "@/store/slices/safety-audit/safetyTransformerAuditApiSlice";
import { useGetSafetyMeteringRoomAuditsQuery } from "@/store/slices/safety-audit/safetyMeteringRoomAuditApiSlice";
import { useGetSafetyPanelRoomAuditsQuery } from "@/store/slices/safety-audit/safetyPanelRoomAuditApiSlice";
import { useGetSafetyLdbAuditsQuery } from "@/store/slices/safety-audit/safetyLdbAuditApiSlice";
import { useGetSafetyDgAuditsQuery } from "@/store/slices/safety-audit/safetyDgAuditApiSlice";
import { useGetSafetyEarthingAuditsQuery } from "@/store/slices/safety-audit/safetyEarthingAuditApiSlice";
import { useGetSafetyUpsAuditsQuery } from "@/store/slices/safety-audit/safetyUpsAuditApiSlice";
import { useGetSafetyGeneralAuditsQuery } from "@/store/slices/safety-audit/safetyGeneralAuditApiSlice";
import { useGetSafetyWiringAuditsQuery } from "@/store/slices/safety-audit/safetyWiringAuditApiSlice";
import { useGetSafetyLoadAnalysisAuditsQuery } from "@/store/slices/safety-audit/safetyLoadAnalysisAuditApiSlice";
import { useGetSafetyLeakInspectionAuditsQuery } from "@/store/slices/safety-audit/safetyLeakInspectionAuditApiSlice";
import { useGetSafetyThermographyAuditsQuery } from "@/store/slices/safety-audit/safetyThermographyAuditApiSlice";
import { useGetSafetyElevatorAuditsQuery } from "@/store/slices/safety-audit/safetyElevatorAuditApiSlice";
import { useGetSafetyPacVentilationAuditsQuery } from "@/store/slices/safety-audit/safetyPacVentilationAuditApiSlice";
import { useGetSafetyPumpCompressorAuditsQuery } from "@/store/slices/safety-audit/safetyPumpCompressorAuditApiSlice";
import { useGetSafetyAdditionalItemsAuditsQuery } from "@/store/slices/safety-audit/safetyAdditionalItemsAuditApiSlice";
import { useGetSafetyDocumentsAuditsQuery } from "@/store/slices/safety-audit/safetyDocumentsAuditApiSlice";

interface SafetyUtilityAccountPreviewContentProps {
  facilityId: string;
  utilityAccount: UtilityAccount;
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

function isEmptyPreviewSection(section: {
  rows: { length: number };
  columns: { key: string }[];
}) {
  return section.rows.length === 1 && section.columns[0]?.key === "message";
}

export function SafetyUtilityAccountPreviewContent({
  facilityId,
  utilityAccount,
}: SafetyUtilityAccountPreviewContentProps) {
  const utilityAccountId = utilityAccount._id;

  const auditor = utilityAccount.auditor_id as {
    name?: string;
  } | null;
  const auditorName =
    typeof auditor === "object" && auditor ? auditor.name : undefined;

  const isStepIncluded = useCallback(
    (stepId: string) =>
      isDataSheetSectionIncludedForStep(utilityAccount, stepId),
    [utilityAccount],
  );

  const listArg = useMemo(
    () => ({
      facility_id: facilityId,
      utility_account_id: utilityAccountId,
    }),
    [facilityId, utilityAccountId],
  );

  const skipBase = !utilityAccountId || !facilityId;

  const { data: tData } = useGetSafetyTransformerAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("transformers"),
  });
  const { data: mrData } = useGetSafetyMeteringRoomAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("metering-room"),
  });
  const { data: prData } = useGetSafetyPanelRoomAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("panel-room"),
  });
  const { data: ldbData } = useGetSafetyLdbAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("light-db"),
  });
  const { data: dgData } = useGetSafetyDgAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("dg-set"),
  });
  const { data: earthData } = useGetSafetyEarthingAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("earthing-system"),
  });
  const { data: upsData } = useGetSafetyUpsAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("ups-battery"),
  });
  const { data: genData } = useGetSafetyGeneralAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("general-safety"),
  });
  const { data: wireData } = useGetSafetyWiringAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("wiring-inspection"),
  });
  const { data: loadData } = useGetSafetyLoadAnalysisAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("load-analysis"),
  });
  const { data: leakData } = useGetSafetyLeakInspectionAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("leak-inspection"),
  });
  const { data: thermData } = useGetSafetyThermographyAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("thermography"),
  });
  const { data: elevData } = useGetSafetyElevatorAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("elevator-safety"),
  });
  const { data: pacData } = useGetSafetyPacVentilationAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("pac-ventilation"),
  });
  const { data: pumpData } = useGetSafetyPumpCompressorAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("pump-compressor"),
  });
  const { data: addData } = useGetSafetyAdditionalItemsAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("additional-items"),
  });
  const { data: docData } = useGetSafetyDocumentsAuditsQuery(listArg, {
    skip: skipBase || !isStepIncluded("documents-review"),
  });

  const recordCompletionContext = useMemo<SafetyAuditRecordCompletionContext>(
    () => ({
      transformers: tData?.data,
      "metering-room": mrData?.data,
      "panel-room": prData?.data,
      "light-db": ldbData?.data,
      "dg-set": dgData?.data,
      "earthing-system": earthData?.data,
      "ups-battery": upsData?.data,
      "general-safety": genData?.data,
      "wiring-inspection": wireData?.data,
      "load-analysis": loadData?.data,
      "leak-inspection": leakData?.data,
      thermography: thermData?.data,
      "elevator-safety": elevData?.data,
      "pac-ventilation": pacData?.data,
      "pump-compressor": pumpData?.data,
      "additional-items": addData?.data,
      "documents-review": docData?.data,
    }),
    [
      tData?.data,
      mrData?.data,
      prData?.data,
      ldbData?.data,
      dgData?.data,
      earthData?.data,
      upsData?.data,
      genData?.data,
      wireData?.data,
      loadData?.data,
      leakData?.data,
      thermData?.data,
      elevData?.data,
      pacData?.data,
      pumpData?.data,
      addData?.data,
      docData?.data,
    ],
  );

  const includedStepIds = useMemo(
    () =>
      ELECTRICAL_SAFETY_AUDIT_STEPS.filter((step) =>
        isStepIncluded(step.id),
      ).map((step) => step.id),
    [isStepIncluded],
  );

  const previewSheetTabs = useMemo(
    () =>
      buildSafetyAuditPreviewSheetTabs(
        includedStepIds,
        recordCompletionContext,
      ),
    [includedStepIds, recordCompletionContext],
  );

  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  const activePreviewTab =
    previewSheetTabs.find((tab) => tab.stepId === selectedStepId) ??
    previewSheetTabs[0] ??
    null;

  useEffect(() => {
    if (!previewSheetTabs.length) return;
    const hasSelectedTab = previewSheetTabs.some(
      (tab) => tab.stepId === selectedStepId,
    );
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
      `facility-safety-audit-${utilityAccount.account_number}-${safeLabel}`,
    );
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
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
          {auditorName ? (
            <span className="rounded border border-border bg-muted px-2 py-1 text-xs font-normal text-muted-foreground">
              Auditor: {auditorName}
            </span>
          ) : null}
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

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6">
        {previewSheetTabs.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
            No included safety audit sections to preview yet.
          </div>
        ) : activePreviewTab ? (
          activePreviewTab.sections.map((section) => {
            const sectionIsEmpty = isEmptyPreviewSection(section);

            return (
              <section
                key={section.id}
                className={cn(
                  "flex shrink-0 flex-col",
                  isSafetyChecklistPreviewSection(section.id)
                    ? "min-h-[200px]"
                    : "min-h-[160px]",
                )}
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-foreground">
                    {section.title}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {sectionIsEmpty
                      ? "No rows"
                      : isSafetyChecklistPreviewSection(section.id)
                        ? `${section.rows.length} checklist item${section.rows.length === 1 ? "" : "s"}`
                        : `${section.rows.length} record${section.rows.length === 1 ? "" : "s"}`}
                  </span>
                </div>
                <GoogleSheetGrid
                  fillHeight={!isSafetyChecklistPreviewSection(section.id)}
                  columns={section.columns}
                  rows={section.rows}
                  emptyMessage={`No records in ${section.title}.`}
                  className="min-h-[160px]"
                />
              </section>
            );
          })
        ) : null}
      </main>
    </div>
  );
}
