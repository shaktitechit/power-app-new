"use client";

import type { TabProps } from "./types";
import { SafetyTransformerSection } from "@/components/portal/shared/components/safety-audit/transformer/transformer-section";

export function TransformersTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyTransformerSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
