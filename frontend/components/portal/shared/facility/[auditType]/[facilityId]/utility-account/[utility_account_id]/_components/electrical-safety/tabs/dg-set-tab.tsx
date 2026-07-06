"use client";

import type { TabProps } from "./types";
import { SafetyDgSetSection } from "@/components/portal/shared/components/safety-audit/dg-set/dg-set-section";

export function DgSetTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyDgSetSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
