import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyAdditionalItemsAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyAdditionalItemsAudit, {
    entityType: "safety_additional_items_audit",
    entityLabel: "safety additional items audit",
    getDisplayName: (record) =>
      (record?.area_name && String(record.area_name).trim()) ||
      (record?.location && String(record.location).trim()) ||
      "Additional items audit",
  });
