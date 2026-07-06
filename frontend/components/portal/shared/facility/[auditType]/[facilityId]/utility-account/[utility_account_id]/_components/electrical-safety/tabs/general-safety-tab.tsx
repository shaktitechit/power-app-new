"use client";

import type { TabProps } from "./types";
import { SafetyGeneralSafetySection } from "@/components/portal/shared/components/safety-audit/general-safety/general-safety-section";

export function GeneralSafetyTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyGeneralSafetySection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
