"use client";

import type { TabProps } from "./types";
import { StreetLightAuditSection } from "@/components/portal/shared/components/electrical-audit/street-light/street-light-audit-section";

export function StreetLightTab({ model }: TabProps) {
  return (
    <StreetLightAuditSection
      facilityId={model.effectiveFacilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
