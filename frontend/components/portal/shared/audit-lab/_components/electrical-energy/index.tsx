"use client";

import { useState } from "react";
import { type Facility } from "@/store/slices/facilityApiSlice";
import {
  useGetElectricalEnergyAuditSnapshotQuery,
  type FacilityAuditEnergyUtilityNest,
} from "@/store/slices/auditApiSlice";
import { Zap, Loader2, AlertTriangle } from "lucide-react";

// ─── Sub-component imports ───
import { IntegrationsSummaryCard } from "./integrations-summary-card";
import { AccountSandboxExplorer } from "./account-sandbox-explorer";

export default function ElectricalEnergyLab({
  facility,
}: {
  facility: Facility;
}) {
  const { data: snapshotResponse, isLoading, error } =
    useGetElectricalEnergyAuditSnapshotQuery({ facility_id: facility._id });

  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(0);

  const snapshot = snapshotResponse?.data ?? snapshotResponse;
  const utilityAccounts = (snapshot?.utility_accounts || []) as FacilityAuditEnergyUtilityNest[];

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Fetching energy audit snapshot...</p>
        </div>
      </div>
    );
  }

  if (error || !snapshot) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
        <div className="space-y-3 max-w-md">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
          <h3 className="text-lg font-semibold text-foreground">Failed to load snapshot</h3>
          <p className="text-sm text-muted-foreground">
            There was an error retrieving the electrical energy audit records for this facility. Please try again.
          </p>
        </div>
      </div>
    );
  }

  if (utilityAccounts.length === 0) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/5 p-8 text-center">
        <div className="space-y-3 max-w-md">
          <Zap className="h-10 w-10 text-muted-foreground mx-auto animate-pulse" />
          <h3 className="text-base font-semibold">No Utility Accounts Connected</h3>
          <p className="text-sm text-muted-foreground">
            This facility does not have any utility accounts linked to its Electrical Energy Audit program yet.
          </p>
        </div>
      </div>
    );
  }

  // Calculate overall KPIs
  const totalSanctionedDemand = utilityAccounts.reduce((acc, nest) => {
    const accObj = nest.utility_account as any;
    return acc + Number(accObj?.sanctioned_demand_value || 0);
  }, 0);

  const activeAccount = utilityAccounts[activeAccountIndex] || utilityAccounts[0];
  const activeAccDetails = activeAccount?.utility_account as any;

  return (
    <div className="space-y-4 w-full">
      {/* ── Tabular Representation of Connected DataSheets (Full width) ── */}
      <IntegrationsSummaryCard
        utilityAccounts={utilityAccounts}
        totalSanctionedDemand={totalSanctionedDemand}
        demandUnit={activeAccDetails?.sanctioned_demand_unit || "kVA"}
      />

      {/* ── Main Layout: Full Width Explorer Sandbox ── */}
      <div className="w-full">
        {activeAccount && (
          <AccountSandboxExplorer
            utilityAccounts={utilityAccounts}
            activeAccountIndex={activeAccountIndex}
            onSelectAccountIndex={setActiveAccountIndex}
          />
        )}
      </div>
    </div>
  );
}
