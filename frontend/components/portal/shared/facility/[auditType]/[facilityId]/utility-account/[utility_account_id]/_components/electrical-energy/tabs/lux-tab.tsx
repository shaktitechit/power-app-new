"use client";

import type { TabProps } from "./types";
import { LuxMeasurementSection } from "@/components/portal/shared/components/electrical-audit/lux/lux-measurement-section";

export function LuxTab({ model }: TabProps) {
  return (
    <LuxMeasurementSection
      facilityId={model.effectiveFacilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
