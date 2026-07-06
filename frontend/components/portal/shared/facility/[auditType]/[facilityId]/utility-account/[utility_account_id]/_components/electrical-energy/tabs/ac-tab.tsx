"use client";

import type { TabProps } from "./types";
import { ACAuditRecordSection } from "@/components/portal/shared/components/electrical-audit/ac/ac-audit-record-section";

export function ACTab({ model }: TabProps) {
  return (
    <ACAuditRecordSection
      facilityId={model.effectiveFacilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
