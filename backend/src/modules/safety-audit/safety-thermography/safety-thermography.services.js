import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyThermographyAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyThermographyAudit, {
    entityType: "safety_thermography_audit",
    entityLabel: "safety thermography audit",
    getDisplayName: (record) =>
      (record?.location && String(record.location).trim()) ||
      (record?.inspected_by && String(record.inspected_by).trim()) ||
      "Thermography audit",
  });
