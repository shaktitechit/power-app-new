"use client";

import type { TabProps } from "./types";
import { SolarPlantSection } from "@/components/portal/shared/components/electrical-audit/solar-plants/solar-plant-section";

export function SolarTab({ model }: TabProps) {
  return (
    <SolarPlantSection
      utilityAccountId={model.utilityAccountId}
      facilityId={model.effectiveFacilityId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
