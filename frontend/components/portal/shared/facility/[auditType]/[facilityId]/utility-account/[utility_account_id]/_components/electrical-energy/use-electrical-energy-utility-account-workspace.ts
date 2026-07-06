"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Info, IndianRupee, FileText, Sun, Power, Zap, Droplets, Thermometer, Wind, Lightbulb, Fan, SunDim, Battery, Package, CheckCircle2 } from "lucide-react";
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
import { dgSetHasAudit } from "@/components/portal/shared/components/electrical-audit/connection/dg-sets/dg-set-utils";
import { pumpHasAudit } from "@/components/portal/shared/components/electrical-audit/pumps/pump-utils";
import { transformerHasAudit } from "@/components/portal/shared/components/electrical-audit/transformers/transformer-utils";
import {
  buildSolarGenerationForms,
  countAuditedPeriods,
  filterSolarRecordsForPlant,
} from "@/components/portal/shared/components/electrical-audit/solar-plants/solar-generation-record-utils";
import { useGetHVACAuditsQuery } from "@/store/slices/electrical-audit/hvacAuditApiSlice";
import { useGetACAuditRecordsQuery } from "@/store/slices/electrical-audit/acAuditRecordApiSlice";
import { useGetLightingAuditsQuery } from "@/store/slices/electrical-audit/lightingAuditApiSlice";
import { useGetStreetLightAuditsQuery } from "@/store/slices/electrical-audit/streetLightAuditApiSlice";
import { useGetFanAuditRecordsQuery } from "@/store/slices/electrical-audit/fanAuditRecordApiSlice";
import { useGetLuxMeasurementsQuery } from "@/store/slices/electrical-audit/luxMeasurementApiSlice";
import { useGetUPSAuditsQuery } from "@/store/slices/electrical-audit/upsAuditApiSlice";
import { useGetMiscLoadAuditsQuery } from "@/store/slices/electrical-audit/miscLoadAuditApiSlice";
import {
  getUtilityFinalAuditSubmissionEntry,
  getUtilityAuditStepState,
  hasUtilityFinalAuditSubmission,
  isDataSheetSectionIncludedForStep,
  UTILITY_AUDIT_STEP_IDS,
} from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import {
  isUtilityAuditStepCompletedFromRecords,
  type EnergyAuditRecordCompletionContext,
} from "@/components/portal/lib/electrical-audit/utility-audit-section-completion";
import type { TabItem } from "../shared/utility-account-workspace-types";
import { useUtilityAccountBase } from "../shared/use-utility-account-base";

/** Full electrical **energy** audit: utility tariff, billing, loads, HVAC, preview. */
export function useElectricalEnergyUtilityAccountWorkspace() {
  const base = useUtilityAccountBase();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const {
    utilityAccountId,
    effectiveFacilityId,
    utilityAccount,
    utilityAccountLoading,
  } = base;

  const skipBase = !utilityAccountId || !effectiveFacilityId;
  const isStepIncluded = useCallback(
    (step: string) =>
      isDataSheetSectionIncludedForStep(
        utilityAccount as Parameters<
          typeof isDataSheetSectionIncludedForStep
        >[0],
        step,
      ),
    [utilityAccount],
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
    facility_id: effectiveFacilityId,
  };
  const { data: solarPlantsData } = useGetSolarPlantsQuery(entityQueryParams, {
    skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.SOLAR),
  });
  const { data: solarGenData } = useGetSolarGenerationRecordsQuery(
    { utility_account_id: utilityAccountId, facility_id: effectiveFacilityId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.SOLAR) },
  );
  const { data: dgSetsData } = useGetDGSetsQuery(entityQueryParams, {
    skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.DG),
  });
  const { data: dgAuditData } = useGetDGAuditRecordsQuery(
    { utility_account_id: utilityAccountId, facility_id: effectiveFacilityId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.DG) },
  );
  const { data: transformersData } = useGetTransformersQuery(entityQueryParams, {
    skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.TRANSFORMER),
  });
  const { data: transformerAuditData } = useGetTransformerAuditRecordsQuery(
    { utility_account_id: utilityAccountId, facility_id: effectiveFacilityId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.TRANSFORMER) },
  );
  const { data: pumpsData } = useGetPumpsQuery(entityQueryParams, {
    skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.PUMP),
  });
  const { data: pumpAuditData } = useGetPumpAuditRecordsQuery(
    { utility_account_id: utilityAccountId, facility_id: effectiveFacilityId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.PUMP) },
  );
  const { data: hvacData } = useGetHVACAuditsQuery(
    { facility_id: effectiveFacilityId, utility_account_id: utilityAccountId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.HVAC) },
  );
  const { data: acData } = useGetACAuditRecordsQuery(
    { facility_id: effectiveFacilityId, utility_account_id: utilityAccountId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.AC) },
  );
  const { data: lightingData } = useGetLightingAuditsQuery(
    { facility_id: effectiveFacilityId, utility_account_id: utilityAccountId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.LIGHTING) },
  );
  const { data: streetLightData } = useGetStreetLightAuditsQuery(
    { facility_id: effectiveFacilityId, utility_account_id: utilityAccountId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.STREET_LIGHT) },
  );
  const { data: fanData } = useGetFanAuditRecordsQuery(
    { facility_id: effectiveFacilityId, utility_account_id: utilityAccountId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.FAN) },
  );
  const { data: luxData } = useGetLuxMeasurementsQuery(
    { facility_id: effectiveFacilityId, utility_account_id: utilityAccountId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.LUX) },
  );
  const { data: upsData } = useGetUPSAuditsQuery(
    { facility_id: effectiveFacilityId, utility_account_id: utilityAccountId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.UPS) },
  );
  const { data: miscData } = useGetMiscLoadAuditsQuery(
    { facility_id: effectiveFacilityId, utility_account_id: utilityAccountId },
    { skip: skipBase || !isStepIncluded(UTILITY_AUDIT_STEP_IDS.MISC) },
  );

  const tariffCount = tariffData?.data?.length ?? 0;
  const billingCount = billingData?.data?.length ?? 0;

  const solarPlants = useMemo(
    () => solarPlantsData?.data ?? [],
    [solarPlantsData],
  );
  const utilityBillingRecords = useMemo(
    () => billingData?.data ?? [],
    [billingData],
  );
  const solarGenRecords = useMemo(
    () => solarGenData?.data ?? [],
    [solarGenData],
  );
  const dgSets = useMemo(() => dgSetsData?.data ?? [], [dgSetsData]);
  const dgAuditRecords = useMemo(
    () => dgAuditData?.data ?? [],
    [dgAuditData],
  );
  const transformers = useMemo(
    () => transformersData?.data ?? [],
    [transformersData],
  );
  const transformerAuditRecords = useMemo(
    () => transformerAuditData?.data ?? [],
    [transformerAuditData],
  );
  const pumps = useMemo(() => pumpsData?.data ?? [], [pumpsData]);
  const pumpAuditRecords = useMemo(
    () => pumpAuditData?.data ?? [],
    [pumpAuditData],
  );

  const solarPlantCount = solarPlants.length;
  const dgSetCount = dgSets.length;
  const transformerCount = transformers.length;
  const pumpCount = pumps.length;

  const isSolarStepFullyAudited = useMemo(() => {
    if (solarPlantCount === 0) return false;
    return solarPlants.every((plant) => {
      const plantRecords = filterSolarRecordsForPlant(
        solarGenRecords,
        plant._id,
      );
      const forms = buildSolarGenerationForms(
        utilityBillingRecords,
        plantRecords,
      );
      const { audited, total } = countAuditedPeriods(forms);
      return total > 0 && audited >= total;
    });
  }, [
    solarPlants,
    solarPlantCount,
    solarGenRecords,
    utilityBillingRecords,
  ]);

  const isDgStepFullyAudited = useMemo(() => {
    if (dgSetCount === 0) return false;
    return dgSets.every((dgSet) =>
      dgSetHasAudit(dgSet._id, dgAuditRecords),
    );
  }, [dgSets, dgSetCount, dgAuditRecords]);

  const isTransformerStepFullyAudited = useMemo(() => {
    if (transformerCount === 0) return false;
    return transformers.every((transformer) =>
      transformerHasAudit(transformer._id, transformerAuditRecords),
    );
  }, [transformers, transformerCount, transformerAuditRecords]);

  const isPumpStepFullyAudited = useMemo(() => {
    if (pumpCount === 0) return false;
    return pumps.every((pump) => pumpHasAudit(pump._id, pumpAuditRecords));
  }, [pumps, pumpCount, pumpAuditRecords]);
  const hvacCount = hvacData?.data?.length ?? 0;
  const acCount = acData?.data?.length ?? 0;
  const lightingCount = lightingData?.data?.length ?? 0;
  const streetLightCount = streetLightData?.data?.length ?? 0;
  const fanCount = fanData?.data?.length ?? 0;
  const luxCount = luxData?.data?.length ?? 0;
  const upsCount = upsData?.data?.length ?? 0;
  const miscCount = miscData?.data?.length ?? 0;

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

  const resolveStepCompleted = useCallback(
    (stepId: string) => {
      const sheetState = getUtilityAuditStepState(
        utilityAccount as Parameters<typeof getUtilityAuditStepState>[0],
        stepId,
      );

      if (isStepIncluded(stepId)) {
        return isUtilityAuditStepCompletedFromRecords(
          stepId,
          recordCompletionContext,
        );
      }

      return sheetState.completed;
    },
    [utilityAccount, recordCompletionContext, isStepIncluded],
  );

  const tabs = useMemo<TabItem[]>(() => {
    const stepCompleted = (stepId: string) => resolveStepCompleted(stepId);

    return [
      { id: "details", label: "Utility Account Details", icon: Info },

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.TARIFF)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.TARIFF,
            label: "Utility Tarrif",
            count: tariffCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.TARIFF),
            icon: IndianRupee,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.BILLING)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.BILLING,
            label: "Utility Billing Records",
            count: billingCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.BILLING),
            icon: FileText,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.SOLAR)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.SOLAR,
            label: "Solar Audit",
            count: solarPlantCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.SOLAR),
            icon: Sun,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.DG)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.DG,
            label: "DG Audit",
            count: dgSetCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.DG),
            icon: Power,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.TRANSFORMER)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.TRANSFORMER,
            label: "Transformer Audit",
            count: transformerCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.TRANSFORMER),
            icon: Zap,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.PUMP)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.PUMP,
            label: "Pump Audit",
            count: pumpCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.PUMP),
            icon: Droplets,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.HVAC)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.HVAC,
            label: "HVAC Audit",
            count: hvacCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.HVAC),
            icon: Thermometer,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.AC)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.AC,
            label: "AC Audit",
            count: acCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.AC),
            icon: Wind,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.LIGHTING)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.LIGHTING,
            label: "Lighting Audit",
            count: lightingCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.LIGHTING),
            icon: Lightbulb,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.STREET_LIGHT)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.STREET_LIGHT,
            label: "Street Light Audit",
            count: streetLightCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.STREET_LIGHT),
            icon: Lightbulb,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.FAN)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.FAN,
            label: "Fan Audit",
            count: fanCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.FAN),
            icon: Fan,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.LUX)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.LUX,
            label: "LUX Measurement",
            count: luxCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.LUX),
            icon: SunDim,
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.UPS)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.UPS,
            label: "UPS Audit",
            count: upsCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.UPS),
            icon: Battery, // Battery is imported!
          }
        : null,

      isStepIncluded(UTILITY_AUDIT_STEP_IDS.MISC)
        ? {
            id: UTILITY_AUDIT_STEP_IDS.MISC,
            label: "Misc Audit",
            count: miscCount,
            completed: stepCompleted(UTILITY_AUDIT_STEP_IDS.MISC),
            icon: Package,
          }
        : null,
    ].filter(Boolean) as TabItem[];
  }, [
    resolveStepCompleted,
    isStepIncluded,
    tariffCount,
    billingCount,
    solarPlantCount,
    dgSetCount,
    transformerCount,
    pumpCount,
    hvacCount,
    acCount,
    lightingCount,
    streetLightCount,
    fanCount,
    luxCount,
    upsCount,
    miscCount,
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
    const stepReady = (stepId: string) => resolveStepCompleted(stepId);

    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.TARIFF) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.TARIFF)
    ) {
      missing.push("Utility tariff records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.BILLING) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.BILLING)
    ) {
      missing.push("Utility billing records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.HVAC) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.HVAC)
    ) {
      missing.push("HVAC audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.AC) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.AC)
    ) {
      missing.push("AC audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.LIGHTING) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.LIGHTING)
    ) {
      missing.push("Lighting audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.STREET_LIGHT) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.STREET_LIGHT)
    ) {
      missing.push("Street Light audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.FAN) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.FAN)
    ) {
      missing.push("Fan audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.LUX) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.LUX)
    ) {
      missing.push("LUX measurement records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.UPS) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.UPS)
    ) {
      missing.push("UPS audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.MISC) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.MISC)
    ) {
      missing.push("Misc audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.SOLAR) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.SOLAR)
    ) {
      missing.push("Solar audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.DG) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.DG)
    ) {
      missing.push("DG audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.TRANSFORMER) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.TRANSFORMER)
    ) {
      missing.push("Transformer audit records");
    }
    if (
      isStepIncluded(UTILITY_AUDIT_STEP_IDS.PUMP) &&
      !stepReady(UTILITY_AUDIT_STEP_IDS.PUMP)
    ) {
      missing.push("Pump audit records");
    }

    return missing;
  }, [resolveStepCompleted, isStepIncluded]);
  const canFinalSubmit = finalSubmitMissingItems.length === 0;

  const validTabIds = useMemo(() => tabs.map((tab) => tab.id), [tabs]);

  const replaceTabInUrl = useCallback(
    (tabId: string) => {
      if (!pathname) return;
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tabId);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const activeTab = useMemo(() => {
    const urlTab = searchParams.get("tab");
    if (urlTab && validTabIds.includes(urlTab)) return urlTab;
    if (urlTab && utilityAccountLoading) return urlTab;
    return "details";
  }, [searchParams, validTabIds, utilityAccountLoading]);

  useEffect(() => {
    if (utilityAccountLoading || !pathname) return;

    const urlTab = searchParams.get("tab");
    if (!urlTab) {
      replaceTabInUrl("details");
      return;
    }

    if (!validTabIds.includes(urlTab)) {
      replaceTabInUrl("details");
    }
  }, [
    utilityAccountLoading,
    pathname,
    searchParams,
    validTabIds,
    replaceTabInUrl,
  ]);

  const handleTabChange = (tabId: string) => {
    const validTab = validTabIds.includes(tabId) ? tabId : "details";
    replaceTabInUrl(validTab);
  };

  return {
    ...base,
    tabs,
    activeTab,
    handleTabChange,
    finalAuditLocked,
    finalAuditSubmission,
    facilityAuditLocked,
    auditStepLocked,
    auditStatusLabel,
    tariffCount,
    billingCount,
    solarPlantCount,
    dgSetCount,
    transformerCount,
    pumpCount,
    hvacCount,
    acCount,
    lightingCount,
    streetLightCount,
    fanCount,
    luxCount,
    upsCount,
    miscCount,
    finalSubmitMissingItems,
    canFinalSubmit,
    recordCompletionContext,
  };
}

export type ElectricalEnergyUtilityAccountWorkspaceModel = ReturnType<
  typeof useElectricalEnergyUtilityAccountWorkspace
>;
