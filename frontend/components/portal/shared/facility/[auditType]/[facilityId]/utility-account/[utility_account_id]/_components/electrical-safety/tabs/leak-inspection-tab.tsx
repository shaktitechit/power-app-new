"use client";

import type { TabProps } from "./types";
import { SafetyLeakInspectionSection } from "@/components/portal/shared/components/safety-audit/leak-inspection/leak-inspection-section";

export function LeakInspectionTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyLeakInspectionSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
