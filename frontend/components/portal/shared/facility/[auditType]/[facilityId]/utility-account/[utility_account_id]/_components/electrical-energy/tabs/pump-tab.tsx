"use client";

import type { TabProps } from "./types";
import { PumpSection } from "@/components/portal/shared/components/electrical-audit/pumps/pump-section";

export function PumpTab({ model }: TabProps) {
  return (
    <PumpSection
      utilityAccountId={model.utilityAccountId}
      facilityId={model.effectiveFacilityId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
