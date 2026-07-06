"use client";

import {
  UTILITY_AUDIT_STEP_IDS,
  getDataSheetKeyForStep,
  isDataSheetSectionIncluded,
} from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import type { DataSheetKey } from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";
import type { ElectricalEnergyUtilityAccountWorkspaceModel } from "./use-electrical-energy-utility-account-workspace";
import type { TabProps } from "./tabs/types";

import {
  TariffTab,
  BillingTab,
  SolarTab,
  DGTab,
  TransformerTab,
  PumpTab,
  HVACTab,
  ACTab,
  LightingTab,
  StreetLightTab,
  FanTab,
  LuxTab,
  UPSTab,
  MiscTab,
} from "./tabs";

const TAB_COMPONENTS: Record<string, React.FC<TabProps>> = {
  [UTILITY_AUDIT_STEP_IDS.TARIFF]: TariffTab,
  [UTILITY_AUDIT_STEP_IDS.BILLING]: BillingTab,
  [UTILITY_AUDIT_STEP_IDS.SOLAR]: SolarTab,
  [UTILITY_AUDIT_STEP_IDS.DG]: DGTab,
  [UTILITY_AUDIT_STEP_IDS.TRANSFORMER]: TransformerTab,
  [UTILITY_AUDIT_STEP_IDS.PUMP]: PumpTab,
  [UTILITY_AUDIT_STEP_IDS.HVAC]: HVACTab,
  [UTILITY_AUDIT_STEP_IDS.AC]: ACTab,
  [UTILITY_AUDIT_STEP_IDS.LIGHTING]: LightingTab,
  [UTILITY_AUDIT_STEP_IDS.STREET_LIGHT]: StreetLightTab,
  [UTILITY_AUDIT_STEP_IDS.FAN]: FanTab,
  [UTILITY_AUDIT_STEP_IDS.LUX]: LuxTab,
  [UTILITY_AUDIT_STEP_IDS.UPS]: UPSTab,
  [UTILITY_AUDIT_STEP_IDS.MISC]: MiscTab,
};

type Props = {
  model: ElectricalEnergyUtilityAccountWorkspaceModel;
  /** Non-null: parent only renders this when the account is loaded. */
  utilityAccount: UtilityAccount;
};

export function UtilityAccountAuditStepPanels({ model, utilityAccount }: Props) {
  const { activeTab } = model;

  if (activeTab === "details") return null;

  const isStepIncluded = (step: string) => {
    const key = getDataSheetKeyForStep(step);
    if (!key) return true;
    return isDataSheetSectionIncluded(utilityAccount.dataSheet, key as DataSheetKey);
  };

  const isIncluded = isStepIncluded(activeTab);
  if (!isIncluded) return null;

  const ActiveTabComponent = TAB_COMPONENTS[activeTab];
  if (!ActiveTabComponent) return null;

  return <ActiveTabComponent model={model} utilityAccount={utilityAccount} />;
}
