import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyPanelRoomAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyPanelRoomAudit, {
    entityType: "safety_panel_room_audit",
    entityLabel: "safety panel room audit",
  });
