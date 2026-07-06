"use client";

import type { TabProps } from "./types";
import { SafetyMeteringRoomSection } from "@/components/portal/shared/components/safety-audit/metering-room/metering-room-section";

export function MeteringRoomTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyMeteringRoomSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
