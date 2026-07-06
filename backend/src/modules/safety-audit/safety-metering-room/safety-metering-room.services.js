import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyMeteringRoomAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyMeteringRoomAudit, {
    entityType: "safety_metering_room_audit",
    entityLabel: "safety metering room audit",
    getDisplayName: () => "Metering room safety audit",
  });
