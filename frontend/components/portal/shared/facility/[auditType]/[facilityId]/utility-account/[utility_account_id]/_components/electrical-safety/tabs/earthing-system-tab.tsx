"use client";

import type { TabProps } from "./types";
import { SafetyEarthingSystemSection } from "@/components/portal/shared/components/safety-audit/earthing-system/earthing-system-section";

export function EarthingSystemTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyEarthingSystemSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
