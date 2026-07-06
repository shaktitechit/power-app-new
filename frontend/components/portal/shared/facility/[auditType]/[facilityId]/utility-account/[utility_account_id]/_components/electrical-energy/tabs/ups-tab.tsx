"use client";

import type { TabProps } from "./types";
import { UPSAuditSection } from "@/components/portal/shared/components/electrical-audit/ups/ups-audit-section";

export function UPSTab({ model }: TabProps) {
  return (
    <UPSAuditSection
      facilityId={model.effectiveFacilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
