"use client";

import { useCallback, useState } from "react";
import { toastHandler } from "@/components/portal/lib/toast";
import { useUpdateSafetyAdditionalItemsAuditMutation } from "@/store/slices/safety-audit/safetyAdditionalItemsAuditApiSlice";
import { useUpdateSafetyDgAuditMutation } from "@/store/slices/safety-audit/safetyDgAuditApiSlice";
import { useUpdateSafetyDocumentsAuditMutation } from "@/store/slices/safety-audit/safetyDocumentsAuditApiSlice";
import { useUpdateSafetyEarthingAuditMutation } from "@/store/slices/safety-audit/safetyEarthingAuditApiSlice";
import { useUpdateSafetyElevatorAuditMutation } from "@/store/slices/safety-audit/safetyElevatorAuditApiSlice";
import { useUpdateSafetyGeneralAuditMutation } from "@/store/slices/safety-audit/safetyGeneralAuditApiSlice";
import { useUpdateSafetyLdbAuditMutation } from "@/store/slices/safety-audit/safetyLdbAuditApiSlice";
import { useUpdateSafetyLeakInspectionAuditMutation } from "@/store/slices/safety-audit/safetyLeakInspectionAuditApiSlice";
import { useUpdateSafetyLoadAnalysisAuditMutation } from "@/store/slices/safety-audit/safetyLoadAnalysisAuditApiSlice";
import { useUpdateSafetyMeteringRoomAuditMutation } from "@/store/slices/safety-audit/safetyMeteringRoomAuditApiSlice";
import { useUpdateSafetyPacVentilationAuditMutation } from "@/store/slices/safety-audit/safetyPacVentilationAuditApiSlice";
import { useUpdateSafetyPanelRoomAuditMutation } from "@/store/slices/safety-audit/safetyPanelRoomAuditApiSlice";
import { useUpdateSafetyPumpCompressorAuditMutation } from "@/store/slices/safety-audit/safetyPumpCompressorAuditApiSlice";
import { useUpdateSafetyThermographyAuditMutation } from "@/store/slices/safety-audit/safetyThermographyAuditApiSlice";
import { useUpdateSafetyTransformerAuditMutation } from "@/store/slices/safety-audit/safetyTransformerAuditApiSlice";
import { useUpdateSafetyUpsAuditMutation } from "@/store/slices/safety-audit/safetyUpsAuditApiSlice";
import { useUpdateSafetyWiringAuditMutation } from "@/store/slices/safety-audit/safetyWiringAuditApiSlice";

type CompletenessMutation = (arg: {
  id: string;
  is_completed: boolean;
}) => { unwrap: () => Promise<unknown> };

export function useSafetyAuditPreviewCompleteness() {
  const [updateTransformer] = useUpdateSafetyTransformerAuditMutation();
  const [updateMeteringRoom] = useUpdateSafetyMeteringRoomAuditMutation();
  const [updatePanelRoom] = useUpdateSafetyPanelRoomAuditMutation();
  const [updateLightDb] = useUpdateSafetyLdbAuditMutation();
  const [updateDgSet] = useUpdateSafetyDgAuditMutation();
  const [updateEarthing] = useUpdateSafetyEarthingAuditMutation();
  const [updateUpsBattery] = useUpdateSafetyUpsAuditMutation();
  const [updateGeneralSafety] = useUpdateSafetyGeneralAuditMutation();
  const [updateWiring] = useUpdateSafetyWiringAuditMutation();
  const [updateLoadAnalysis] = useUpdateSafetyLoadAnalysisAuditMutation();
  const [updateLeakInspection] = useUpdateSafetyLeakInspectionAuditMutation();
  const [updateThermography] = useUpdateSafetyThermographyAuditMutation();
  const [updateElevator] = useUpdateSafetyElevatorAuditMutation();
  const [updatePacVentilation] = useUpdateSafetyPacVentilationAuditMutation();
  const [updatePumpCompressor] = useUpdateSafetyPumpCompressorAuditMutation();
  const [updateAdditionalItems] = useUpdateSafetyAdditionalItemsAuditMutation();
  const [updateDocumentsReview] = useUpdateSafetyDocumentsAuditMutation();

  const [savingKey, setSavingKey] = useState<string | null>(null);

  const mutationBySection: Record<string, CompletenessMutation> = {
    "transformers-records": updateTransformer,
    "metering-room-records": updateMeteringRoom,
    "panel-room-records": updatePanelRoom,
    "light-db-records": updateLightDb,
    "dg-set-records": updateDgSet,
    "earthing-system-records": updateEarthing,
    "ups-battery-records": updateUpsBattery,
    "general-safety-records": updateGeneralSafety,
    "wiring-inspection-records": updateWiring,
    "load-analysis-records": updateLoadAnalysis,
    "leak-inspection-records": updateLeakInspection,
    "thermography-records": updateThermography,
    "elevator-safety-records": updateElevator,
    "pac-ventilation-records": updatePacVentilation,
    "pump-compressor-records": updatePumpCompressor,
    "additional-items-records": updateAdditionalItems,
    "documents-review-records": updateDocumentsReview,
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
      updateAdditionalItems,
      updateDgSet,
      updateDocumentsReview,
      updateEarthing,
      updateElevator,
      updateGeneralSafety,
      updateLeakInspection,
      updateLightDb,
      updateLoadAnalysis,
      updateMeteringRoom,
      updatePacVentilation,
      updatePanelRoom,
      updatePumpCompressor,
      updateThermography,
      updateTransformer,
      updateUpsBattery,
      updateWiring,
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

      const recordsToUpdate = records.filter(
        (r) => r.isCompleted !== targetCompletedState,
      );
      if (recordsToUpdate.length === 0) return true;

      try {
        setSavingKey(`bulk:${sectionId}`);
        await toastHandler({
          action: () =>
            Promise.all(
              recordsToUpdate.map((r) =>
                updateRecord({
                  id: r.id,
                  is_completed: targetCompletedState,
                }).unwrap(),
              ),
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
      updateAdditionalItems,
      updateDgSet,
      updateDocumentsReview,
      updateEarthing,
      updateElevator,
      updateGeneralSafety,
      updateLeakInspection,
      updateLightDb,
      updateLoadAnalysis,
      updateMeteringRoom,
      updatePacVentilation,
      updatePanelRoom,
      updatePumpCompressor,
      updateThermography,
      updateTransformer,
      updateUpsBattery,
      updateWiring,
    ],
  );

  const isSavingRecord = useCallback(
    (sectionId: string, recordId: string) =>
      savingKey === `${sectionId}:${recordId}` ||
      savingKey === `bulk:${sectionId}`,
    [savingKey],
  );

  return { toggleRecordCompleteness, bulkUpdateRecordCompleteness, isSavingRecord };
}
