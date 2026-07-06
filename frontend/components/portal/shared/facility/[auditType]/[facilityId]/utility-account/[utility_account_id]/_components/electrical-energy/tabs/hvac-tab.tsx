"use client";

import type { TabProps } from "./types";
import { HVACAuditSection } from "@/components/portal/shared/components/electrical-audit/hvac/hvac-audit-section";

export function HVACTab({ model }: TabProps) {
  return (
    <HVACAuditSection
      facilityId={model.effectiveFacilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
