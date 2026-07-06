"use client";

import type { TabProps } from "./types";
import { FanAuditRecordSection } from "@/components/portal/shared/components/electrical-audit/fan/fan-audit-record";

export function FanTab({ model }: TabProps) {
  return (
    <FanAuditRecordSection
      facilityId={model.effectiveFacilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
