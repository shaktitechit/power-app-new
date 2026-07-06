import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyLeakInspectionAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyLeakInspectionAudit, {
    entityType: "safety_leak_inspection_audit",
    entityLabel: "safety leak inspection audit",
    getDisplayName: (record) =>
      (record?.equipment_name &&
        String(record.equipment_name).trim()) ||
      "Leak inspection audit",
  });
