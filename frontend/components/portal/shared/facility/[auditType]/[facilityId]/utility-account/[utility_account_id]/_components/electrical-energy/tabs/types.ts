import type { ElectricalEnergyUtilityAccountWorkspaceModel } from "../use-electrical-energy-utility-account-workspace";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";

export type TabProps = {
  model: ElectricalEnergyUtilityAccountWorkspaceModel;
  utilityAccount: UtilityAccount;
};
