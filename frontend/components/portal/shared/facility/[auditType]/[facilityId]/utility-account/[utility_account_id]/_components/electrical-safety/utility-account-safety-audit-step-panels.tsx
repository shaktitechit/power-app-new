"use client";

import {
  AdditionalItemsTab,
  DgSetTab,
  DocumentsReviewTab,
  EarthingSystemTab,
  ElevatorSafetyTab,
  GeneralSafetyTab,
  LeakInspectionTab,
  LightDbTab,
  LoadAnalysisTab,
  MeteringRoomTab,
  PacVentilationTab,
  PanelRoomTab,
  PumpCompressorTab,
  ThermographyTab,
  TransformersTab,
  UpsBatteryTab,
  WiringInspectionTab,
} from "./tabs";
import type { UtilityAccount } from "@/store/slices/electrical-audit/utilityApiSlice";
import type { ElectricalSafetyUtilityAccountWorkspaceModel } from "./use-electrical-safety-utility-account-workspace";

type Props = {
  model: ElectricalSafetyUtilityAccountWorkspaceModel;
  utilityAccount: UtilityAccount;
  facilityId: string;
};

export function UtilityAccountSafetyAuditStepPanels({
  model,
  utilityAccount,
  facilityId,
}: Props) {
  const { activeTab } = model;

  const tabProps = {
    model,
    utilityAccount,
    facilityId,
  };

  return (
    <>
      {activeTab === "transformers" && (
        <TransformersTab {...tabProps} />
      )}

      {activeTab === "metering-room" && (
        <MeteringRoomTab {...tabProps} />
      )}

      {activeTab === "panel-room" && (
        <PanelRoomTab {...tabProps} />
      )}

      {activeTab === "light-db" && (
        <LightDbTab {...tabProps} />
      )}

      {activeTab === "dg-set" && (
        <DgSetTab {...tabProps} />
      )}

      {activeTab === "earthing-system" && (
        <EarthingSystemTab {...tabProps} />
      )}

      {activeTab === "ups-battery" && (
        <UpsBatteryTab {...tabProps} />
      )}

      {activeTab === "general-safety" && (
        <GeneralSafetyTab {...tabProps} />
      )}

      {activeTab === "wiring-inspection" && (
        <WiringInspectionTab {...tabProps} />
      )}

      {activeTab === "load-analysis" && (
        <LoadAnalysisTab {...tabProps} />
      )}

      {activeTab === "leak-inspection" && (
        <LeakInspectionTab {...tabProps} />
      )}

      {activeTab === "thermography" && (
        <ThermographyTab {...tabProps} />
      )}

      {activeTab === "elevator-safety" && (
        <ElevatorSafetyTab {...tabProps} />
      )}

      {activeTab === "pac-ventilation" && (
        <PacVentilationTab {...tabProps} />
      )}

      {activeTab === "pump-compressor" && (
        <PumpCompressorTab {...tabProps} />
      )}

      {activeTab === "additional-items" && (
        <AdditionalItemsTab {...tabProps} />
      )}

      {activeTab === "documents-review" && (
        <DocumentsReviewTab {...tabProps} />
      )}
    </>
  );
}
