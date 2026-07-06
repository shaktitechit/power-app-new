"use client";

import type { TabProps } from "./types";
import { SafetyUpsBatterySection } from "@/components/portal/shared/components/safety-audit/ups-battery/ups-battery-section";

export function UpsBatteryTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyUpsBatterySection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
