import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyGeneralAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyGeneralAudit, {
    entityType: "safety_general_audit",
    entityLabel: "safety general audit",
  });
