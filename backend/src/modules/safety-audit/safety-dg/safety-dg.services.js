import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyDgAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyDgAudit, {
    entityType: "safety_dg_audit",
    entityLabel: "safety DG audit",
    extraQueryKeys: ["dg_set_id"],
  });
