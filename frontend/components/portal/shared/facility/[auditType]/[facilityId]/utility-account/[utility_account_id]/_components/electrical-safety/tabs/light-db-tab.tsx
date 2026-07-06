"use client";

import type { TabProps } from "./types";
import { SafetyLightDbSection } from "@/components/portal/shared/components/safety-audit/light-db/light-db-section";

export function LightDbTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyLightDbSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
