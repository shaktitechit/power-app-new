import { EnergyKpiSection } from "../../audit-snapshot-kpi-summary";
import { isPlainObject } from "../../../shared/audit-snapshot-table-utils";
import {
  isDataSheetSectionIncluded,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";
import type { UtilityAccountDataSheet } from "@/store/slices/electrical-audit/utilityApiSlice";

function tryNum(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

export function computeUtilityAccountsKpis(rows: unknown[], columns: string[]): EnergyKpiSection[] {
  let count = 0;

  
  let sum_total_sanctioned_demand = 0;
  let count_audit_completed = 0;
  let count_solar_connected = 0;
  let count_dg_connected = 0;
  let count_transformer_connected = 0;
  let count_pump_connected = 0;

  for (const row of rows) {
    if (!isPlainObject(row)) continue;
    
    const recordsToProcess: any[] = [];
    recordsToProcess.push(row);
    
    for (const r of recordsToProcess) {
      count++;
    
    
    sum_total_sanctioned_demand += tryNum(r['sanctioned_demand_kVA']);
    const accountStatus = String(r['accountStatus'] ?? "").toLowerCase();
    if (accountStatus === "completed") count_audit_completed += 1;
    const dataSheet = isPlainObject(r['dataSheet'])
      ? (r['dataSheet'] as UtilityAccountDataSheet)
      : null;
    if (isDataSheetSectionIncluded(dataSheet, "solar")) count_solar_connected += 1;
    if (isDataSheetSectionIncluded(dataSheet, "dg")) count_dg_connected += 1;
    if (isDataSheetSectionIncluded(dataSheet, "transformer")) count_transformer_connected += 1;
    if (isDataSheetSectionIncluded(dataSheet, "pump")) count_pump_connected += 1;
    }
  }

  
  
  
  
  
  
  

  return [
    {
      id: "utility-accounts-kpis_dataset",
      title: "Utility Accounts Summary",
      subtitle: `${rows.length} record${rows.length === 1 ? '' : 's'} analyzed in this dataset`,
      displayMode: "table",
      kpis: [
        {
          columnKey: "total_accounts",
          label: "Total Utility Accounts",
          value: count,
        },
        {
          columnKey: "total_sanctioned_demand",
          label: "Total Sanctioned Demand (kVA)",
          value: sum_total_sanctioned_demand,
        },
        {
          columnKey: "audit_completed_accounts",
          label: "Audit Completed Accounts",
          value: count_audit_completed,
        },
        {
          columnKey: "solar_connected",
          label: "Solar Connected",
          value: count_solar_connected,
        },
        {
          columnKey: "dg_connected",
          label: "DG Connected",
          value: count_dg_connected,
        },
        {
          columnKey: "transformer_connected",
          label: "Transformer Connected",
          value: count_transformer_connected,
        },
        {
          columnKey: "pump_connected",
          label: "Pump Connected",
          value: count_pump_connected,
        },
      ],
    },
  ];
}
