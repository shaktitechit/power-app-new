"use client";

import type { TabProps } from "./types";
import { SafetyAdditionalItemsSection } from "@/components/portal/shared/components/safety-audit/additional-items/additional-items-section";

export function AdditionalItemsTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyAdditionalItemsSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
