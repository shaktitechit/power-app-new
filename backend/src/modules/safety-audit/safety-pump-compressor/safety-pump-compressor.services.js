import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyPumpCompressorAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyPumpCompressorAudit, {
    entityType: "safety_pump_compressor_audit",
    entityLabel: "safety pump / compressor audit",
    getDisplayName: (record) =>
      (record?.equipment_name && String(record.equipment_name).trim()) ||
      "Pump / compressor audit",
  });
