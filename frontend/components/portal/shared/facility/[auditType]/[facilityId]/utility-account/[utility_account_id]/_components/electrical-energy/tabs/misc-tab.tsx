"use client";

import type { TabProps } from "./types";
import { MiscLoadAuditSection } from "@/components/portal/shared/components/electrical-audit/misc/misc-load-audit-section";

export function MiscTab({ model }: TabProps) {
  return (
    <MiscLoadAuditSection
      facilityId={model.effectiveFacilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
