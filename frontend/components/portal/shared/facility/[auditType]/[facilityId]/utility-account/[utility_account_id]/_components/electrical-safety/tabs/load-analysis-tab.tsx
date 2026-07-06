"use client";

import type { TabProps } from "./types";
import { SafetyLoadAnalysisSection } from "@/components/portal/shared/components/safety-audit/load-analysis/load-analysis-section";

export function LoadAnalysisTab({ model, utilityAccount, facilityId }: TabProps) {
  return (
    <SafetyLoadAnalysisSection
      facilityId={facilityId}
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
