import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyTransformerAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyTransformerAudit, {
    entityType: "safety_transformer_audit",
    entityLabel: "safety transformer audit",
    extraQueryKeys: ["transformer_id"],
  });
