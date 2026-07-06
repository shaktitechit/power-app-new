import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyEarthingAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyEarthingAudit, {
    entityType: "safety_earthing_audit",
    entityLabel: "safety earthing audit",
  });
