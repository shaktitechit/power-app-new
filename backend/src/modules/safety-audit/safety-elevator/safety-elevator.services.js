import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SafetyElevatorAudit } = modelsRegistry;

import { createSafetyAuditCrudServices } from "../safety-audit.helpers.js";

export const {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} = createSafetyAuditCrudServices(SafetyElevatorAudit, {
    entityType: "safety_elevator_audit",
    entityLabel: "safety elevator audit",
    getDisplayName: (record) =>
      (record?.elevator_name &&
        String(record.elevator_name).trim()) ||
      "Elevator safety audit",
  });
