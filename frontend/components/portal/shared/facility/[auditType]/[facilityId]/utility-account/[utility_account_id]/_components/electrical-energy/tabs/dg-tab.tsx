"use client";

import type { TabProps } from "./types";
import { DGSetSection } from "@/components/portal/shared/components/electrical-audit/connection/dg-sets/dg-set-section";

export function DGTab({ model }: TabProps) {
  return (
    <DGSetSection
      utilityAccountId={model.utilityAccountId}
      facilityId={model.effectiveFacilityId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
