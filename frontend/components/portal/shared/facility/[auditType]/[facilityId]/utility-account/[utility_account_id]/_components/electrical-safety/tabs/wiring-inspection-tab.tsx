"use client";

import type { TabProps } from "./types";
import { SafetyWiringInspectionSection } from "@/components/portal/shared/components/safety-audit/wiring-inspection/wiring-inspection-section";

export function WiringInspectionTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyWiringInspectionSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
