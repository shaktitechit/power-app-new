"use client";

import type { TabProps } from "./types";
import { UtilityTariffSection } from "@/components/portal/shared/components/electrical-audit/utility-tariff/utility-tariff-section";

export function TariffTab({ model }: TabProps) {
  return (
    <UtilityTariffSection
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
    />
  );
}
