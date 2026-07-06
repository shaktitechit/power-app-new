"use client";

import type { TabProps } from "./types";
import { SafetyPanelRoomSection } from "@/components/portal/shared/components/safety-audit/panel-room/panel-room-section";

export function PanelRoomTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyPanelRoomSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
