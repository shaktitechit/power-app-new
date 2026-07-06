import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyUpsAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyUpsAudit, {
    entityType: "safety_ups_audit",
    entityLabel: "safety UPS audit",
  });
