import {
  ALL_ENERGY_DATASHEET_KEYS,
  ACCOUNT_STATUS,
  DATASHEET_KEY_TO_AUDIT_STEP,
} from "./utility-workflow.constants.js";
import {
  ensureUtilityAccountDataSheet,
  resetDataSheetSection,
} from "./utility-workflow.service.js";

const RECORD_MODELS_BY_SHEET_KEY = {
  tariff: ["UtilityTariff"],
  billing: ["UtilityBillingRecord"],
  hvac: ["HVACAudit"],
  ac: ["ACAuditRecord"],
  lighting: ["LightingAuditRecord"],
  "street-light": ["StreetLightAuditRecord"],
  fan: ["FanAuditRecord"],
  lux: ["LuxMeasurement"],
  ups: ["UPSAudit"],
  misc: ["MiscLoadAuditRecord"],
  solar: ["SolarGenerationRecord"],
  dg: ["DGAuditRecord"],
  transformer: ["TransformerAuditRecord"],
  pump: ["PumpAuditRecord"],
  transformers: ["SafetyTransformerAudit"],
  "metering-room": ["SafetyMeteringRoomAudit"],
  "panel-room": ["SafetyPanelRoomAudit"],
  "light-db": ["SafetyLdbAudit"],
  "dg-set": ["SafetyDgAudit"],
  "earthing-system": ["SafetyEarthingAudit"],
  "ups-battery": ["SafetyUpsAudit"],
  "general-safety": ["SafetyGeneralAudit"],
  "wiring-inspection": ["SafetyWiringAudit"],
  "load-analysis": ["SafetyLoadAnalysisAudit"],
  "leak-inspection": ["SafetyLeakInspectionAudit"],
  thermography: ["SafetyThermographyAudit"],
  "elevator-safety": ["SafetyElevatorAudit"],
  "pac-ventilation": ["SafetyPacVentilationAudit"],
  "pump-compressor": ["SafetyPumpCompressorAudit"],
  "additional-items": ["SafetyAdditionalItemsAudit"],
  "documents-review": ["SafetyDocumentsAudit"],
};

let modelsPromise = null;

const getModels = async () => {
  if (!modelsPromise) {
    modelsPromise = import("../../data/modelRegistry.js").then(
      ({ modelsRegistry }) => modelsRegistry,
    );
  }
  return modelsPromise;
};

/** Included energy audit sections on this utility account (`dataSheet.*.connected`). */
export const getIncludedDataSheetKeys = (utilityAccount) => {
  ensureUtilityAccountDataSheet(utilityAccount);
  return ALL_ENERGY_DATASHEET_KEYS.filter(
    (key) => utilityAccount.dataSheet?.[key]?.connected === true,
  );
};

/**
 * Revert utility account workflow to pending for all included sections.
 * Does not save or touch individual audit records.
 */
export const applyOpenUtilityAudit = (utilityAccount) => {
  ensureUtilityAccountDataSheet(utilityAccount);

  utilityAccount.accountStatus = ACCOUNT_STATUS.PENDING;
  utilityAccount.account_completed_at = null;
  utilityAccount.account_completed_by = null;

  const submissions =
    utilityAccount.audit_step_submissions &&
    typeof utilityAccount.audit_step_submissions === "object"
      ? { ...utilityAccount.audit_step_submissions }
      : {};

  const includedKeys = getIncludedDataSheetKeys(utilityAccount);

  for (const sheetKey of includedKeys) {
    utilityAccount.dataSheet = resetDataSheetSection({
      dataSheet: utilityAccount.dataSheet,
      sheetKey,
    });

    const stepId = DATASHEET_KEY_TO_AUDIT_STEP[sheetKey];
    if (stepId) {
      delete submissions[stepId];
    }
  }

  delete submissions["preview-and-submit"];
  delete submissions["safety-preview-and-submit"];

  utilityAccount.audit_step_submissions = submissions;
  utilityAccount.markModified("dataSheet");
  utilityAccount.markModified("audit_step_submissions");
};

/** Bulk mark all audit records in included sections as pending. */
export const resetIncludedAuditRecordsToPending = async (
  utilityAccountId,
  includedSheetKeys,
) => {
  const models = await getModels();
  const filter = { utility_account_id: utilityAccountId };

  for (const sheetKey of includedSheetKeys) {
    const modelNames = RECORD_MODELS_BY_SHEET_KEY[sheetKey] || [];
    for (const modelName of modelNames) {
      const Model = models[modelName];
      if (!Model) continue;
      await Model.updateMany(filter, { $set: { is_completed: false } });
    }
  }
};
