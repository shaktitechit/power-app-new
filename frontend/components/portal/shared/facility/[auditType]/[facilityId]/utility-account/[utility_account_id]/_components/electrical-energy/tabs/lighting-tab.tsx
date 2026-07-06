"use client";

import type { TabProps } from "./types";
import { LightingAuditSection } from "@/components/portal/shared/components/electrical-audit/lighting/lighting-audit-section";

export function LightingTab({ model }: TabProps) {
  return (
    <LightingAuditSection
      facilityId={model.effectiveFacilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
