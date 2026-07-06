import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyLoadAnalysisAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyLoadAnalysisAudit, {
    entityType: "safety_load_analysis_audit",
    entityLabel: "safety load analysis audit",
    getDisplayName: () => "Load analysis safety audit",
  });
