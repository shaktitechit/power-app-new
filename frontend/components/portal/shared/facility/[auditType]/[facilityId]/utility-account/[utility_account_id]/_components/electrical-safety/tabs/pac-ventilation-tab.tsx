"use client";

import type { TabProps } from "./types";
import { SafetyPacVentilationSection } from "@/components/portal/shared/components/safety-audit/pac-ventilation/pac-ventilation-section";

export function PacVentilationTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyPacVentilationSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
