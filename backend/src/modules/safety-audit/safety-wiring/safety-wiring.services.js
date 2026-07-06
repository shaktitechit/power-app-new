import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyWiringAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyWiringAudit, {
    entityType: "safety_wiring_audit",
    entityLabel: "safety wiring audit",
  });
