"use client";

import type { TabProps } from "./types";
import { TransformerSection } from "@/components/portal/shared/components/electrical-audit/transformers/transformer-section";

export function TransformerTab({ model }: TabProps) {
  return (
    <TransformerSection
      utilityAccountId={model.utilityAccountId}
      facilityId={model.effectiveFacilityId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
