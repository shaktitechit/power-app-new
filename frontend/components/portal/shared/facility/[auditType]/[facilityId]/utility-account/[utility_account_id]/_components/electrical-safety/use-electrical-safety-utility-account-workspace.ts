"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TabItem } from "../shared/utility-account-workspace-types";
import { useUtilityAccountBase } from "../shared/use-utility-account-base";
import { ELECTRICAL_SAFETY_AUDIT_STEPS } from "@/components/portal/lib/electrical-audit/safety-audit-workflow";
import {
  getUtilityFinalAuditSubmissionEntry,
  hasUtilityFinalAuditSubmission,
  LEGACY_SAFETY_ONLY_FINAL_SUBMIT_STEP_ID,
  UTILITY_AUDIT_STEP_IDS,
  isDataSheetSectionIncludedForStep,
} from "@/components/portal/lib/electrical-audit/utility-audit-steps";
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
import type { SafetyAuditRecordCompletionContext } from "@/components/portal/lib/electrical-audit/safety-audit-preview-sheet";

const TAB_DETAILS = "details";

/** Electrical **safety** audit: account details, checklist tabs, preview & submit. */
export function useElectricalSafetyUtilityAccountWorkspace() {
  const base = useUtilityAccountBase();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { facilityPathPrefix, utilityAccountId, effectiveFacilityId, utilityAccount, utilityAccountLoading } =
    base;

  const skipBase = !utilityAccountId || !effectiveFacilityId;

  const listArg = useMemo(
    () => ({
      facility_id: effectiveFacilityId,
      utility_account_id: utilityAccountId,
    }),
    [effectiveFacilityId, utilityAccountId],
  );

  const { data: tData } = useGetSafetyTransformerAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: mrData } = useGetSafetyMeteringRoomAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: prData } = useGetSafetyPanelRoomAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: ldbData } = useGetSafetyLdbAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: dgData } = useGetSafetyDgAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: earthData } = useGetSafetyEarthingAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: upsData } = useGetSafetyUpsAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: genData } = useGetSafetyGeneralAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: wireData } = useGetSafetyWiringAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: loadData } = useGetSafetyLoadAnalysisAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: leakData } = useGetSafetyLeakInspectionAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: thermData } = useGetSafetyThermographyAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: elevData } = useGetSafetyElevatorAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: pacData } = useGetSafetyPacVentilationAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: pumpData } = useGetSafetyPumpCompressorAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: addData } = useGetSafetyAdditionalItemsAuditsQuery(listArg, {
    skip: skipBase,
  });
  const { data: docData } = useGetSafetyDocumentsAuditsQuery(listArg, {
    skip: skipBase,
  });

  const safetyStepCounts = useMemo(
    () => ({
      transformers: tData?.data?.length ?? 0,
      "metering-room": mrData?.data?.length ?? 0,
      "panel-room": prData?.data?.length ?? 0,
      "light-db": ldbData?.data?.length ?? 0,
      "dg-set": dgData?.data?.length ?? 0,
      "earthing-system": earthData?.data?.length ?? 0,
      "ups-battery": upsData?.data?.length ?? 0,
      "general-safety": genData?.data?.length ?? 0,
      "wiring-inspection": wireData?.data?.length ?? 0,
      "load-analysis": loadData?.data?.length ?? 0,
      "leak-inspection": leakData?.data?.length ?? 0,
      thermography: thermData?.data?.length ?? 0,
      "elevator-safety": elevData?.data?.length ?? 0,
      "pac-ventilation": pacData?.data?.length ?? 0,
      "pump-compressor": pumpData?.data?.length ?? 0,
      "additional-items": addData?.data?.length ?? 0,
      "documents-review": docData?.data?.length ?? 0,
    }),
    [
      tData?.data?.length,
      mrData?.data?.length,
      prData?.data?.length,
      ldbData?.data?.length,
      dgData?.data?.length,
      earthData?.data?.length,
      upsData?.data?.length,
      genData?.data?.length,
      wireData?.data?.length,
      loadData?.data?.length,
      leakData?.data?.length,
      thermData?.data?.length,
      elevData?.data?.length,
      pacData?.data?.length,
      pumpData?.data?.length,
      addData?.data?.length,
      docData?.data?.length,
    ],
  );

  const safetyStepRecords = useMemo(
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

  const resolveStepCompleted = useCallback(
    (stepId: string) => {
      const records = safetyStepRecords[stepId as keyof typeof safetyStepRecords];
      const list = records ?? [];
      return list.length > 0 && list.every((record: any) => record.is_completed === true);
    },
    [safetyStepRecords],
  );

  const tabs = useMemo<TabItem[]>(() => {
    const activeSteps = ELECTRICAL_SAFETY_AUDIT_STEPS.filter((s) =>
      isDataSheetSectionIncludedForStep(utilityAccount, s.id),
    );

    return [
      { id: TAB_DETAILS, label: "Utility Account Details" },
      ...activeSteps.map((s) => {
        const count = safetyStepCounts[s.id as keyof typeof safetyStepCounts] ?? 0;
        return {
          id: s.id,
          label: s.label,
          count,
          completed: resolveStepCompleted(s.id),
        };
      }),
    ];
  }, [
    utilityAccount?.dataSheet,
    safetyStepCounts,
    resolveStepCompleted,
  ]);

  const finalAuditLocked = useMemo(
    () => hasUtilityFinalAuditSubmission(utilityAccount?.audit_step_submissions),
    [utilityAccount?.audit_step_submissions],
  );

  const finalAuditSubmission = getUtilityFinalAuditSubmissionEntry(
    utilityAccount?.audit_step_submissions,
  );

  const facilityAuditLocked = Boolean(base.facility?.audit_closure?.closed_at);
  const auditStepLocked = finalAuditLocked || facilityAuditLocked;
  const auditStatusLabel = finalAuditLocked ? "Completed" : "Pending";

  const finalSubmitMissingItems = useMemo(() => {
    const missing: string[] = [];
    const activeSteps = ELECTRICAL_SAFETY_AUDIT_STEPS.filter((s) =>
      isDataSheetSectionIncludedForStep(utilityAccount, s.id),
    );
    for (const s of activeSteps) {
      if (!resolveStepCompleted(s.id)) {
        missing.push(s.label);
      }
    }
    return missing;
  }, [utilityAccount?.dataSheet, resolveStepCompleted]);

  const canFinalSubmit = finalSubmitMissingItems.length === 0;

  const validTabIds = useMemo(() => tabs.map((t) => t.id), [tabs]);

  const replaceTabInUrl = useCallback(
    (tabId: string) => {
      if (!pathname) return;
      const p = new URLSearchParams(searchParams.toString());
      p.set("tab", tabId);
      router.replace(`${pathname}?${p.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && validTabIds.includes(urlTab)) return urlTab;
    if (urlTab && utilityAccountLoading) return urlTab;
    return TAB_DETAILS;
  }, [searchParams, validTabIds, utilityAccountLoading]);

  useEffect(() => {
    if (utilityAccountLoading || !pathname) return;
    const urlTab = searchParams.get("tab");
    if (!urlTab) {
      replaceTabInUrl(TAB_DETAILS);
      return;
    }
    if (!validTabIds.includes(urlTab)) {
      replaceTabInUrl(TAB_DETAILS);
    }
  }, [
    utilityAccountLoading,
    pathname,
    searchParams,
    validTabIds,
    replaceTabInUrl,
  ]);

  const handleTabChange = (tabId: string) => {
    const validTab = validTabIds.includes(tabId) ? tabId : TAB_DETAILS;
    replaceTabInUrl(validTab);
  };

  return {
    ...base,
    tabs,
    activeTab,
    handleTabChange,
    auditStepLocked,
    facilityAuditLocked,
    finalAuditLocked,
    finalAuditSubmission,
    auditStatusLabel,
    safetyStepCounts,
    recordCompletionContext,
    finalSubmitMissingItems,
    canFinalSubmit,
  };
}

export type ElectricalSafetyUtilityAccountWorkspaceModel = ReturnType<
  typeof useElectricalSafetyUtilityAccountWorkspace
>;
