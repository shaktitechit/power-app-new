"use client";

import { useCallback, useState } from "react";
import { toastHandler } from "@/components/portal/lib/toast";
import { useUpdateACAuditRecordMutation } from "@/store/slices/electrical-audit/acAuditRecordApiSlice";
import { useUpdateDGAuditRecordMutation } from "@/store/slices/electrical-audit/dgAuditRecordApiSlice";
import { useUpdateFanAuditRecordMutation } from "@/store/slices/electrical-audit/fanAuditRecordApiSlice";
import { useUpdateHVACAuditMutation } from "@/store/slices/electrical-audit/hvacAuditApiSlice";
import { useUpdateLightingAuditMutation } from "@/store/slices/electrical-audit/lightingAuditApiSlice";
import { useUpdateLuxMeasurementMutation } from "@/store/slices/electrical-audit/luxMeasurementApiSlice";
import { useUpdateMiscLoadAuditMutation } from "@/store/slices/electrical-audit/miscLoadAuditApiSlice";
import { useUpdatePumpAuditRecordMutation } from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";
import { useUpdateSolarGenerationRecordMutation } from "@/store/slices/electrical-audit/solarGenerationRecordApiSlice";
import { useUpdateStreetLightAuditMutation } from "@/store/slices/electrical-audit/streetLightAuditApiSlice";
import { useUpdateTransformerAuditRecordMutation } from "@/store/slices/electrical-audit/transformerAuditRecordApiSlice";
import { useUpdateUPSAuditMutation } from "@/store/slices/electrical-audit/upsAuditApiSlice";
import { useUpdateUtilityBillingRecordMutation } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import { useUpdateUtilityTariffMutation } from "@/store/slices/electrical-audit/utilityTariffApiSlice";

type CompletenessMutation = (arg: {
  id: string;
  is_completed: boolean;
}) => { unwrap: () => Promise<unknown> };

export function useUtilityAuditPreviewCompleteness() {
  const [updateTariff] = useUpdateUtilityTariffMutation();
  const [updateBilling] = useUpdateUtilityBillingRecordMutation();
  const [updateHvac] = useUpdateHVACAuditMutation();
  const [updateAc] = useUpdateACAuditRecordMutation();
  const [updateLighting] = useUpdateLightingAuditMutation();
  const [updateFan] = useUpdateFanAuditRecordMutation();
  const [updateLux] = useUpdateLuxMeasurementMutation();
  const [updateMisc] = useUpdateMiscLoadAuditMutation();
  const [updateSolarGeneration] = useUpdateSolarGenerationRecordMutation();
  const [updateDgAudit] = useUpdateDGAuditRecordMutation();
  const [updateTransformerAudit] = useUpdateTransformerAuditRecordMutation();
  const [updatePumpAudit] = useUpdatePumpAuditRecordMutation();
  const [updateStreetLight] = useUpdateStreetLightAuditMutation();
  const [updateUps] = useUpdateUPSAuditMutation();

  const [savingKey, setSavingKey] = useState<string | null>(null);

  const mutationBySection: Record<string, CompletenessMutation> = {
    "tariff-records": updateTariff,
    "billing-records": updateBilling,
    "hvac-records": updateHvac,
    "ac-records": updateAc,
    "lighting-records": updateLighting,
    "street-light-records": updateStreetLight,
    "fan-records": updateFan,
    "lux-records": updateLux,
    "ups-records": updateUps,
    "misc-records": updateMisc,
    "solar-generation-records": updateSolarGeneration,
    "dg-audit-records": updateDgAudit,
    "transformer-audit-records": updateTransformerAudit,
    "pump-audit-records": updatePumpAudit,
  };

  const toggleRecordCompleteness = useCallback(
    async (
      sectionId: string,
      recordId: string,
      isCompleted: boolean,
    ): Promise<boolean> => {
      const updateRecord = mutationBySection[sectionId];
      if (!updateRecord) return false;

      const savingId = `${sectionId}:${recordId}`;
      try {
        setSavingKey(savingId);
        await toastHandler({
          action: () =>
            updateRecord({
              id: recordId,
              is_completed: !isCompleted,
            }).unwrap(),
          loading: "Updating status…",
          success: isCompleted ? "Marked as pending" : "Marked as completed",
        });
        return true;
      } catch {
        return false;
      } finally {
        setSavingKey(null);
      }
    },
    [
      updateAc,
      updateBilling,
      updateDgAudit,
      updateFan,
      updateHvac,
      updateLighting,
      updateLux,
      updateMisc,
      updatePumpAudit,
      updateSolarGeneration,
      updateStreetLight,
      updateTariff,
      updateTransformerAudit,
      updateUps,
    ],
  );

  const bulkUpdateRecordCompleteness = useCallback(
    async (
      sectionId: string,
      records: { id: string; isCompleted: boolean }[],
      targetCompletedState: boolean,
    ): Promise<boolean> => {
      const updateRecord = mutationBySection[sectionId];
      if (!updateRecord) return false;

      const recordsToUpdate = records.filter(r => r.isCompleted !== targetCompletedState);
      if (recordsToUpdate.length === 0) return true;

      try {
        setSavingKey(`bulk:${sectionId}`);
        await toastHandler({
          action: () =>
            Promise.all(
              recordsToUpdate.map(r =>
                updateRecord({
                  id: r.id,
                  is_completed: targetCompletedState,
                }).unwrap()
              )
            ),
          loading: `Updating status for ${recordsToUpdate.length} record(s)...`,
          success: `Successfully marked ${recordsToUpdate.length} record(s) as ${targetCompletedState ? "completed" : "pending"}`,
        });
        return true;
      } catch {
        return false;
      } finally {
        setSavingKey(null);
      }
    },
    [
      updateAc,
      updateBilling,
      updateDgAudit,
      updateFan,
      updateHvac,
      updateLighting,
      updateLux,
      updateMisc,
      updatePumpAudit,
      updateSolarGeneration,
      updateStreetLight,
      updateTariff,
      updateTransformerAudit,
      updateUps,
    ],
  );

  const isSavingRecord = useCallback(
    (sectionId: string, recordId: string) =>
      savingKey === `${sectionId}:${recordId}` || savingKey === `bulk:${sectionId}`,
    [savingKey],
  );

  return { toggleRecordCompleteness, bulkUpdateRecordCompleteness, isSavingRecord };
}
