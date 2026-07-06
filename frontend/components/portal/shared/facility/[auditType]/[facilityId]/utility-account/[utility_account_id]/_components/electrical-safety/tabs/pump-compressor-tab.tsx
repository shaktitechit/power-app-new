"use client";

import type { TabProps } from "./types";
import { SafetyPumpCompressorSection } from "@/components/portal/shared/components/safety-audit/pump-compressor/pump-compressor-section";

export function PumpCompressorTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyPumpCompressorSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
