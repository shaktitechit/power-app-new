import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyPacVentilationAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyPacVentilationAudit, {
    entityType: "safety_pac_ventilation_audit",
    entityLabel: "safety PAC / ventilation audit",
    getDisplayName: (record) =>
      (record?.unit_name && String(record.unit_name).trim()) ||
      "PAC / ventilation audit",
  });
