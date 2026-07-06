"use client";

import type { TabProps } from "./types";
import { SafetyElevatorSafetySection } from "@/components/portal/shared/components/safety-audit/elevator-safety/elevator-safety-section";

export function ElevatorSafetyTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyElevatorSafetySection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
