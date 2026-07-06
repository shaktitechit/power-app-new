"use client";

import { useMemo } from "react";
import type { TabProps } from "./types";
import { UtilityBillingRecordSection } from "@/components/portal/shared/components/electrical-audit/utility-billing-record/utility-billing-record-section";
import {
  getLatestUtilityTariff,
  getTariffPeriodDayCount,
  toTariffDateInput,
} from "@/components/portal/lib/electrical-audit/utility-tariff-period";
import { useGetUtilityTariffsQuery } from "@/store/slices/electrical-audit/utilityTariffApiSlice";

export function BillingTab({ model, utilityAccount }: TabProps) {
  const { data: tariffData } = useGetUtilityTariffsQuery({
    utility_account_id: model.utilityAccountId,
  });

  const latestTariff = useMemo(
    () => getLatestUtilityTariff(tariffData?.data ?? []),
    [tariffData],
  );

  const maxBillingDays = useMemo(
    () => getTariffPeriodDayCount(latestTariff),
    [latestTariff],
  );

  return (
    <UtilityBillingRecordSection
      utilityAccountId={model.utilityAccountId}
      auditStepLocked={model.auditStepLocked}
      billingCycle={
        utilityAccount.billing_cycle === "monthly" ||
        utilityAccount.billing_cycle === "bi-monthly" ||
        utilityAccount.billing_cycle === "quarterly"
          ? utilityAccount.billing_cycle
          : "monthly"
      }
      maxBillingDays={maxBillingDays}
      tariffPeriodStart={
        latestTariff?.effective_from
          ? toTariffDateInput(latestTariff.effective_from)
          : undefined
      }
      tariffPeriodEnd={
        latestTariff?.effective_to
          ? toTariffDateInput(latestTariff.effective_to)
          : undefined
      }
    />
  );
}
