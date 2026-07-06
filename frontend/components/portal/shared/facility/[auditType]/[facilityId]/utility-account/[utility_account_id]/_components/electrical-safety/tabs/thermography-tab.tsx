"use client";

import type { TabProps } from "./types";
import { SafetyThermographySection } from "@/components/portal/shared/components/safety-audit/thermography/thermography-section";

export function ThermographyTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyThermographySection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
