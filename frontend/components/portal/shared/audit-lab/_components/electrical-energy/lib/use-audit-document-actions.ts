"use client";

import { useCallback, useState } from "react";
import { useDispatch } from "react-redux";
import { apiSlice } from "@/store/slices/apiSlice";
import { toastHandler } from "@/components/portal/lib/toast";
import type { AuditDocumentItem, StoredAuditDocument } from "./audit-document-types";
import { useUpdateUtilityAccountMutation } from "@/store/slices/electrical-audit/utilityApiSlice";
import { useUpdateUtilityTariffMutation } from "@/store/slices/electrical-audit/utilityTariffApiSlice";
import { useUpdateUtilityBillingRecordMutation } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import { useUpdateSolarPlantMutation } from "@/store/slices/electrical-audit/solarPlantApiSlice";
import { useUpdateSolarGenerationRecordMutation } from "@/store/slices/electrical-audit/solarGenerationRecordApiSlice";
import { useUpdateDGSetMutation } from "@/store/slices/electrical-audit/dgSetApiSlice";
import { useUpdateDGAuditRecordMutation } from "@/store/slices/electrical-audit/dgAuditRecordApiSlice";
import { useUpdateTransformerMutation } from "@/store/slices/electrical-audit/transformerApiSlice";
import { useUpdateTransformerAuditRecordMutation } from "@/store/slices/electrical-audit/transformerAuditRecordApiSlice";
import { useUpdatePumpMutation } from "@/store/slices/electrical-audit/pumpApiSlice";
import { useUpdatePumpAuditRecordMutation } from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";
import { useUpdateHVACAuditMutation } from "@/store/slices/electrical-audit/hvacAuditApiSlice";
import { useUpdateACAuditRecordMutation } from "@/store/slices/electrical-audit/acAuditRecordApiSlice";
import { useUpdateLightingAuditMutation } from "@/store/slices/electrical-audit/lightingAuditApiSlice";
import { useUpdateFanAuditRecordMutation } from "@/store/slices/electrical-audit/fanAuditRecordApiSlice";
import { useUpdateLuxMeasurementMutation } from "@/store/slices/electrical-audit/luxMeasurementApiSlice";
import { useUpdateMiscLoadAuditMutation } from "@/store/slices/electrical-audit/miscLoadAuditApiSlice";
import { useUpdateStreetLightAuditMutation } from "@/store/slices/electrical-audit/streetLightAuditApiSlice";
import { useUpdateUPSAuditMutation } from "@/store/slices/electrical-audit/upsAuditApiSlice";

function buildExistingDocuments(
  item: AuditDocumentItem,
  options: { caption?: string; deleteDocument?: boolean },
): StoredAuditDocument[] {
  if (options.deleteDocument) {
    return item.sourceDocuments.filter((_, index) => index !== item.docIndex);
  }

  const caption = options.caption?.trim() ?? "";
  return item.sourceDocuments.map((doc, index) =>
    index === item.docIndex ? { ...doc, caption } : doc,
  );
}

export function useAuditDocumentActions(facilityId: string) {
  const dispatch = useDispatch();
  const [isSaving, setIsSaving] = useState(false);

  const [updateUtilityAccount] = useUpdateUtilityAccountMutation();
  const [updateUtilityTariff] = useUpdateUtilityTariffMutation();
  const [updateUtilityBillingRecord] = useUpdateUtilityBillingRecordMutation();
  const [updateSolarPlant] = useUpdateSolarPlantMutation();
  const [updateSolarGenerationRecord] = useUpdateSolarGenerationRecordMutation();
  const [updateDGSet] = useUpdateDGSetMutation();
  const [updateDGAuditRecord] = useUpdateDGAuditRecordMutation();
  const [updateTransformer] = useUpdateTransformerMutation();
  const [updateTransformerAuditRecord] = useUpdateTransformerAuditRecordMutation();
  const [updatePump] = useUpdatePumpMutation();
  const [updatePumpAuditRecord] = useUpdatePumpAuditRecordMutation();
  const [updateHVACAudit] = useUpdateHVACAuditMutation();
  const [updateACAuditRecord] = useUpdateACAuditRecordMutation();
  const [updateLightingAudit] = useUpdateLightingAuditMutation();
  const [updateFanAuditRecord] = useUpdateFanAuditRecordMutation();
  const [updateLuxMeasurement] = useUpdateLuxMeasurementMutation();
  const [updateMiscLoadAudit] = useUpdateMiscLoadAuditMutation();
  const [updateStreetLightAudit] = useUpdateStreetLightAuditMutation();
  const [updateUPSAudit] = useUpdateUPSAuditMutation();

  const invalidateSnapshot = useCallback(() => {
    dispatch(
      apiSlice.util.invalidateTags([{ type: "AuditSnapshot", id: `${facilityId}:energy` }]),
    );
  }, [dispatch, facilityId]);

  const runDocumentMutation = useCallback(
    async (
      item: AuditDocumentItem,
      existingDocuments: StoredAuditDocument[],
      deleteDocument: boolean,
    ) => {
      const id = item.entityId;
      const existing_documents = existingDocuments as never;

      switch (item.entityType) {
        case "utility_account":
          if (deleteDocument && item.docId) {
            return updateUtilityAccount({
              id,
              removed_document_ids: [item.docId],
            }).unwrap();
          }
          return updateUtilityAccount({ id, existing_documents }).unwrap();
        case "tariff":
          return updateUtilityTariff({ id, existing_documents }).unwrap();
        case "billing":
          return updateUtilityBillingRecord({ id, existing_documents }).unwrap();
        case "solar_plant":
          return updateSolarPlant({ id, existing_documents }).unwrap();
        case "solar_generation_record":
          return updateSolarGenerationRecord({ id, existing_documents }).unwrap();
        case "dg_set":
          return updateDGSet({ id, existing_documents }).unwrap();
        case "dg_audit_record":
          return updateDGAuditRecord({ id, existing_documents }).unwrap();
        case "transformer":
          return updateTransformer({ id, existing_documents }).unwrap();
        case "transformer_audit_record":
          return updateTransformerAuditRecord({ id, existing_documents }).unwrap();
        case "pump":
          return updatePump({ id, existing_documents }).unwrap();
        case "pump_audit_record":
          return updatePumpAuditRecord({ id, existing_documents }).unwrap();
        case "hvac":
          return updateHVACAudit({ id, existing_documents }).unwrap();
        case "ac":
          return updateACAuditRecord({ id, existing_documents }).unwrap();
        case "lighting":
          return updateLightingAudit({ id, existing_documents }).unwrap();
        case "fan":
          return updateFanAuditRecord({ id, existing_documents }).unwrap();
        case "lux":
          return updateLuxMeasurement({ id, existing_documents }).unwrap();
        case "misc":
          return updateMiscLoadAudit({ id, existing_documents }).unwrap();
        case "street_light":
          return updateStreetLightAudit({ id, existing_documents }).unwrap();
        case "ups":
          return updateUPSAudit({ id, existing_documents }).unwrap();
        default:
          throw new Error("Unsupported document source");
      }
    },
    [
      updateUtilityAccount,
      updateUtilityTariff,
      updateUtilityBillingRecord,
      updateSolarPlant,
      updateSolarGenerationRecord,
      updateDGSet,
      updateDGAuditRecord,
      updateTransformer,
      updateTransformerAuditRecord,
      updatePump,
      updatePumpAuditRecord,
      updateHVACAudit,
      updateACAuditRecord,
      updateLightingAudit,
      updateFanAuditRecord,
      updateLuxMeasurement,
      updateMiscLoadAudit,
      updateStreetLightAudit,
      updateUPSAudit,
    ],
  );

  const updateCaption = useCallback(
    async (item: AuditDocumentItem, caption: string) => {
      setIsSaving(true);
      try {
        const existingDocuments = buildExistingDocuments(item, { caption });
        await toastHandler({
          action: () => runDocumentMutation(item, existingDocuments, false),
          loading: "Updating caption...",
          success: "Caption updated successfully",
        });
        invalidateSnapshot();
        return caption.trim();
      } finally {
        setIsSaving(false);
      }
    },
    [invalidateSnapshot, runDocumentMutation],
  );

  const deleteDocument = useCallback(
    async (item: AuditDocumentItem) => {
      setIsSaving(true);
      try {
        const existingDocuments = buildExistingDocuments(item, { deleteDocument: true });
        await toastHandler({
          action: () => runDocumentMutation(item, existingDocuments, true),
          loading: "Deleting document...",
          success: "Document deleted successfully",
        });
        invalidateSnapshot();
      } finally {
        setIsSaving(false);
      }
    },
    [invalidateSnapshot, runDocumentMutation],
  );

  return { updateCaption, deleteDocument, isSaving };
}
