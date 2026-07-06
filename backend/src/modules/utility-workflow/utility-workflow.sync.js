import { SECTION_STATUS } from "./utility-workflow.constants.js";
import {
  ensureUtilityAccountDataSheet,
} from "./utility-workflow.service.js";

// ─── Lazy model loader ────────────────────────────────────────────────────────

let modelsPromise = null;

const getWorkflowModels = async () => {
  if (!modelsPromise) {
    modelsPromise = import("../../data/modelRegistry.js").then(
      ({ modelsRegistry }) => modelsRegistry,
    );
  }
  return modelsPromise;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const resolveEntityIdFromAuditRecord = (fieldValue) => toIdString(fieldValue);

const allRecordsCompleted = (records) =>
  records.length > 0 && records.every((record) => record.is_completed === true);

// ─── Per-section evaluators ───────────────────────────────────────────────────

const evaluateTariffSection = async (utilityAccountId) => {
  const { UtilityTariff } = await getWorkflowModels();
  const records = await UtilityTariff.find({
    utility_account_id: utilityAccountId,
  }).lean();
  if (records.length === 0) return SECTION_STATUS.PENDING;
  return allRecordsCompleted(records)
    ? SECTION_STATUS.COMPLETED
    : SECTION_STATUS.PENDING;
};

const evaluateBillingSection = async (utilityAccountId) => {
  const { UtilityBillingRecord } = await getWorkflowModels();
  const records = await UtilityBillingRecord.find({
    utility_account_id: utilityAccountId,
  }).lean();
  if (records.length === 0) return SECTION_STATUS.PENDING;
  return allRecordsCompleted(records)
    ? SECTION_STATUS.COMPLETED
    : SECTION_STATUS.PENDING;
};

const evaluateSimpleRecordSection = async (utilityAccountId, ModelName) => {
  const models = await getWorkflowModels();
  const Model = models[ModelName];
  if (!Model) return SECTION_STATUS.PENDING;
  const records = await Model.find({ utility_account_id: utilityAccountId }).lean();
  if (records.length === 0) return SECTION_STATUS.PENDING;
  return allRecordsCompleted(records)
    ? SECTION_STATUS.COMPLETED
    : SECTION_STATUS.PENDING;
};

const evaluateEntitySection = async (
  utilityAccountId,
  EntityModelName,
  AuditModelName,
  entityIdField,
) => {
  const models = await getWorkflowModels();
  const EntityModel = models[EntityModelName];
  const AuditModel = models[AuditModelName];
  if (!EntityModel || !AuditModel) return SECTION_STATUS.PENDING;

  const entities = await EntityModel.find({
    utility_account_id: utilityAccountId,
  }).lean();
  if (entities.length === 0) return SECTION_STATUS.PENDING;

  const audits = await AuditModel.find({
    utility_account_id: utilityAccountId,
  })
    .select(`${entityIdField} is_completed`)
    .lean();

  const completedEntityIds = new Set(
    audits
      .filter((a) => a.is_completed === true)
      .map((a) => toIdString(a[entityIdField])),
  );

  const allDone = entities.every((entity) =>
    completedEntityIds.has(String(entity._id)),
  );

  return allDone ? SECTION_STATUS.COMPLETED : SECTION_STATUS.PENDING;
};

const evaluateSolarSection = async (utilityAccountId, billingCount) => {
  const { SolarPlant, SolarGenerationRecord } = await getWorkflowModels();

  const plants = await SolarPlant.find({
    utility_account_id: utilityAccountId,
  }).lean();
  if (plants.length === 0) return SECTION_STATUS.PENDING;

  const expectedCount = plants.length * (billingCount || 1);
  const audits = await SolarGenerationRecord.find({
    utility_account_id: utilityAccountId,
  })
    .select("is_completed")
    .lean();

  if (audits.length < expectedCount) return SECTION_STATUS.PENDING;
  return allRecordsCompleted(audits)
    ? SECTION_STATUS.COMPLETED
    : SECTION_STATUS.PENDING;
};

// ─── Section status evaluation router ────────────────────────────────────────

const evaluateSectionStatus = async (utilityAccountId, sheetKey, section) => {
  switch (sheetKey) {
    case "tariff":
      return evaluateTariffSection(utilityAccountId);

    case "billing":
      return evaluateBillingSection(utilityAccountId);

    case "hvac":
      return evaluateSimpleRecordSection(utilityAccountId, "HVACAudit");

    case "ac":
      return evaluateSimpleRecordSection(utilityAccountId, "ACAuditRecord");

    case "lighting":
      return evaluateSimpleRecordSection(utilityAccountId, "LightingAuditRecord");

    case "street-light":
      return evaluateSimpleRecordSection(utilityAccountId, "StreetLightAuditRecord");

    case "fan":
      return evaluateSimpleRecordSection(utilityAccountId, "FanAuditRecord");

    case "lux":
      return evaluateSimpleRecordSection(utilityAccountId, "LuxMeasurement");

    case "ups":
      return evaluateSimpleRecordSection(utilityAccountId, "UPSAudit");

    case "misc":
      return evaluateSimpleRecordSection(utilityAccountId, "MiscLoadAuditRecord");

    case "pump":
      return evaluateEntitySection(
        utilityAccountId,
        "Pump",
        "PumpAuditRecord",
        "pump_id",
      );

    case "dg":
      return evaluateEntitySection(
        utilityAccountId,
        "DGSet",
        "DGAuditRecord",
        "dg_set_id",
      );

    case "transformer":
      return evaluateEntitySection(
        utilityAccountId,
        "Transformer",
        "TransformerAuditRecord",
        "transformer_id",
      );

    case "solar": {
      const { UtilityBillingRecord } = await getWorkflowModels();
      const billingCount = await UtilityBillingRecord.countDocuments({
        utility_account_id: utilityAccountId,
      });
      return evaluateSolarSection(utilityAccountId, billingCount);
    }

    case "transformers":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyTransformerAudit");
    case "metering-room":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyMeteringRoomAudit");
    case "panel-room":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyPanelRoomAudit");
    case "light-db":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyLdbAudit");
    case "dg-set":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyDgAudit");
    case "earthing-system":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyEarthingAudit");
    case "ups-battery":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyUpsAudit");
    case "general-safety":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyGeneralAudit");
    case "wiring-inspection":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyWiringAudit");
    case "load-analysis":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyLoadAnalysisAudit");
    case "leak-inspection":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyLeakInspectionAudit");
    case "thermography":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyThermographyAudit");
    case "elevator-safety":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyElevatorAudit");
    case "pac-ventilation":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyPacVentilationAudit");
    case "pump-compressor":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyPumpCompressorAudit");
    case "additional-items":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyAdditionalItemsAudit");
    case "documents-review":
      return evaluateSimpleRecordSection(utilityAccountId, "SafetyDocumentsAudit");

    default:
      return null;
  }
};

// ─── Locked section guard ─────────────────────────────────────────────────────

const isSkippedDataSheetSection = (section) => section?.connected === false;

// ─── Automated status writer ──────────────────────────────────────────────────

const applyAutomatedSectionStatus = (section, nextStatus, sheetKey) => {
  if (nextStatus === null) return;
  section.status = nextStatus;

  if (nextStatus === SECTION_STATUS.COMPLETED) {
    section.completed_at = section.completed_at || new Date().toISOString();
  } else {
    section.completed_at = null;
  }
};

// ─── Public sync functions ────────────────────────────────────────────────────

export const syncAuditSectionStatus = async (utilityAccountId, sheetKey) => {
  if (!utilityAccountId || !sheetKey) return null;

  const { UtilityAccount } = await getWorkflowModels();
  const utilityAccount = await UtilityAccount.findById(utilityAccountId);
  if (!utilityAccount) return null;

  ensureUtilityAccountDataSheet(utilityAccount);

  const section = utilityAccount.dataSheet?.[sheetKey];
  if (!section) return utilityAccount;

  if (isSkippedDataSheetSection(section)) {
    return utilityAccount;
  }

  const nextStatus = await evaluateSectionStatus(
    utilityAccountId,
    sheetKey,
    section,
  );

  const previousStatus = section.status;
  applyAutomatedSectionStatus(section, nextStatus, sheetKey);

  if (previousStatus === section.status) {
    return utilityAccount;
  }

  utilityAccount.markModified("dataSheet");
  await utilityAccount.save();

  return utilityAccount;
};

export const syncAllAuditSectionsForUtilityAccount = async (utilityAccountId) => {
  if (!utilityAccountId) return;

  const { UtilityAccount } = await getWorkflowModels();
  const utilityAccount = await UtilityAccount.findById(utilityAccountId);
  if (!utilityAccount) return;

  ensureUtilityAccountDataSheet(utilityAccount);

  const keys = Object.keys(utilityAccount.dataSheet || {});
  for (const sheetKey of keys) {
    await syncAuditSectionStatus(utilityAccountId, sheetKey);
  }
};

export const evaluateDataSheetSectionStatus = evaluateSectionStatus;

// ─── Record-level completion stats (for connection card progress rings) ───────

export const calculateUtilityRecordLevelStats = async (utilityAccountId, dataSheet) => {
  const dataSheetObj = dataSheet || {};

  const {
    UtilityTariff,
    UtilityBillingRecord,
    HVACAudit,
    ACAuditRecord,
    LightingAuditRecord,
    StreetLightAuditRecord,
    FanAuditRecord,
    LuxMeasurement,
    UPSAudit,
    MiscLoadAuditRecord,
    SolarPlant,
    SolarGenerationRecord,
    DGSet,
    DGAuditRecord,
    Transformer,
    TransformerAuditRecord,
    Pump,
    PumpAuditRecord,
    SafetyTransformerAudit,
    SafetyMeteringRoomAudit,
    SafetyPanelRoomAudit,
    SafetyLdbAudit,
    SafetyDgAudit,
    SafetyEarthingAudit,
    SafetyUpsAudit,
    SafetyGeneralAudit,
    SafetyWiringAudit,
    SafetyLoadAnalysisAudit,
    SafetyLeakInspectionAudit,
    SafetyThermographyAudit,
    SafetyElevatorAudit,
    SafetyPacVentilationAudit,
    SafetyPumpCompressorAudit,
    SafetyAdditionalItemsAudit,
    SafetyDocumentsAudit,
  } = await getWorkflowModels();

  const isConnected = (key) => dataSheetObj[key]?.connected === true;

  const promises = [];

  // 1. Tariff
  if (isConnected("tariff")) {
    promises.push(
      UtilityTariff.find({ utility_account_id: utilityAccountId })
        .select("is_completed")
        .lean()
        .then((records) => ({
          key: "tariff",
          type: "record",
          records: records || [],
        }))
    );
  }

  // 2. Billing (also needed for Solar expected-count calculation)
  if (isConnected("billing") || isConnected("solar")) {
    promises.push(
      UtilityBillingRecord.find({ utility_account_id: utilityAccountId })
        .select("is_completed")
        .lean()
        .then((records) => ({
          key: "billing",
          type: "billing",
          records: records || [],
        }))
    );
  }

  // 3. Simple load-audit sheets
  const basicConfigs = [
    { key: "hvac", Model: HVACAudit },
    { key: "ac", Model: ACAuditRecord },
    { key: "lighting", Model: LightingAuditRecord },
    { key: "street-light", Model: StreetLightAuditRecord },
    { key: "fan", Model: FanAuditRecord },
    { key: "lux", Model: LuxMeasurement },
    { key: "ups", Model: UPSAudit },
    { key: "misc", Model: MiscLoadAuditRecord },
    { key: "transformers", Model: SafetyTransformerAudit },
    { key: "metering-room", Model: SafetyMeteringRoomAudit },
    { key: "panel-room", Model: SafetyPanelRoomAudit },
    { key: "light-db", Model: SafetyLdbAudit },
    { key: "dg-set", Model: SafetyDgAudit },
    { key: "earthing-system", Model: SafetyEarthingAudit },
    { key: "ups-battery", Model: SafetyUpsAudit },
    { key: "general-safety", Model: SafetyGeneralAudit },
    { key: "wiring-inspection", Model: SafetyWiringAudit },
    { key: "load-analysis", Model: SafetyLoadAnalysisAudit },
    { key: "leak-inspection", Model: SafetyLeakInspectionAudit },
    { key: "thermography", Model: SafetyThermographyAudit },
    { key: "elevator-safety", Model: SafetyElevatorAudit },
    { key: "pac-ventilation", Model: SafetyPacVentilationAudit },
    { key: "pump-compressor", Model: SafetyPumpCompressorAudit },
    { key: "additional-items", Model: SafetyAdditionalItemsAudit },
    { key: "documents-review", Model: SafetyDocumentsAudit },
  ];

  for (const cfg of basicConfigs) {
    if (isConnected(cfg.key)) {
      promises.push(
        cfg.Model.find({ utility_account_id: utilityAccountId })
          .select("is_completed")
          .lean()
          .then((records) => ({
            key: cfg.key,
            type: "record",
            records: records || [],
          }))
      );
    }
  }

  // 4. Entity-based sheets (Pump, DG, Transformer)
  const entityConfigs = [
    { key: "pump", entityModel: Pump, auditModel: PumpAuditRecord, idField: "pump_id" },
    { key: "dg", entityModel: DGSet, auditModel: DGAuditRecord, idField: "dg_set_id" },
    { key: "transformer", entityModel: Transformer, auditModel: TransformerAuditRecord, idField: "transformer_id" },
  ];

  for (const cfg of entityConfigs) {
    if (isConnected(cfg.key)) {
      promises.push(
        Promise.all([
          cfg.entityModel.find({ utility_account_id: utilityAccountId }).select("_id").lean(),
          cfg.auditModel.find({ utility_account_id: utilityAccountId }).select(`${cfg.idField} is_completed`).lean(),
        ]).then(([entities, audits]) => ({
          key: cfg.key,
          type: "entity",
          entities: entities || [],
          audits: audits || [],
          idField: cfg.idField,
        }))
      );
    }
  }

  // 5. Solar
  if (isConnected("solar")) {
    promises.push(
      Promise.all([
        SolarPlant.find({ utility_account_id: utilityAccountId }).select("_id").lean(),
        SolarGenerationRecord.find({ utility_account_id: utilityAccountId }).select("is_completed").lean(),
      ]).then(([plants, audits]) => ({
        key: "solar",
        type: "solar",
        plants: plants || [],
        audits: audits || [],
      }))
    );
  }

  // Run all queries in parallel
  const results = await Promise.all(promises);

  let total = 0;
  let completed = 0;
  const breakdown = [];

  const billingResult = results.find((r) => r.key === "billing");
  const billingCount = billingResult ? billingResult.records.length : 0;

  results.forEach((res) => {
    if (res.type === "record") {
      const rTotal = res.records.length;
      const rCompleted = res.records.filter((r) => r.is_completed === true).length;
      total += rTotal;
      completed += rCompleted;
      breakdown.push({
        key: res.key,
        completed: rCompleted,
        total: rTotal,
        isDone: rCompleted === rTotal && rTotal > 0,
      });
    } else if (res.type === "billing") {
      if (isConnected("billing")) {
        const rTotal = res.records.length;
        const rCompleted = res.records.filter((r) => r.is_completed === true).length;
        total += rTotal;
        completed += rCompleted;
        breakdown.push({
          key: "billing",
          completed: rCompleted,
          total: rTotal,
          isDone: rCompleted === rTotal && rTotal > 0,
        });
      }
    } else if (res.type === "entity") {
      const eTotal = res.entities.length;
      let eCompleted = 0;
      res.entities.forEach((entity) => {
        const entityId = String(entity._id);
        const hasCompleted = res.audits.some(
          (r) => toIdString(r[res.idField]) === entityId && r.is_completed === true
        );
        if (hasCompleted) eCompleted++;
      });
      total += eTotal;
      completed += eCompleted;
      breakdown.push({
        key: res.key,
        completed: eCompleted,
        total: eTotal,
        isDone: eCompleted === eTotal && eTotal > 0,
      });
    } else if (res.type === "solar") {
      const sTotal = res.plants.length * (billingCount || 1);
      const sCompleted = res.audits.filter((r) => r.is_completed === true).length;
      total += sTotal;
      completed += sCompleted;
      breakdown.push({
        key: "solar",
        completed: sCompleted,
        total: sTotal,
        isDone: sCompleted === sTotal && sTotal > 0,
      });
    }
  });

  // When tariff section is connected but has 0 records, count as 1 pending
  if (isConnected("tariff")) {
    const tariffRes = breakdown.find((b) => b.key === "tariff");
    if (tariffRes && tariffRes.total === 0) {
      tariffRes.total = 1;
      tariffRes.completed = 0;
      tariffRes.isDone = false;
      total += 1;
    }
  }

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { percentage, completed, total, breakdown };
};
