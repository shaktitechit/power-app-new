import type { ElectricalSafetyUtilityAccountWorkspaceModel } from "../use-electrical-safety-utility-account-workspace";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";

export type TabProps = {
  model: ElectricalSafetyUtilityAccountWorkspaceModel;
  utilityAccount: UtilityAccount;
  facilityId: string;
};
