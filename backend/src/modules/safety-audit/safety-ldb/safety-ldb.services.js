import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyLdbAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyLdbAudit, {
    entityType: "safety_ldb_audit",
    entityLabel: "safety LDB audit",
  });
