export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface TransformerRecordKpiResult {
  totalRecords: number;
  totalEnergySupplied: string;
  totalEnergyLosses: string;
  totalCostOfLosses: string;
  avgPercentLoading: string;
  avgPowerFactorLt: string;
  avgLoadFactor: string;
}

export function calculateTransformerRecordKpi(columns: SheetColumn[], rows: SheetRow[]): TransformerRecordKpiResult {
  let sumSupplied = 0, countSupplied = 0;
  let sumLosses = 0, countLosses = 0;
  let sumCost = 0, countCost = 0;
  let sumLoading = 0, countLoading = 0;
  let sumPf = 0, countPf = 0;
  let sumLoadFactor = 0, countLoadFactor = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const suppliedKey = findKey("annual energy supplied") || "annual_energy_supplied_kWh";
  const lossesKey = findKey("annual energy losses") || "annual_energy_losses_kWh";
  const costKey = findKey("cost of losses") || "cost_of_losses_rs";
  const loadingKey = findKey("percent loading") || "percent_loading";
  const pfKey = findKey("power factor") || "power_factor_LT";
  const loadFactorKey = findKey("load factor") || "load_factor_percent";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const supVal = parseVal(row[suppliedKey]);
    if (supVal !== null) { sumSupplied += supVal; countSupplied++; }

    const losVal = parseVal(row[lossesKey]);
    if (losVal !== null) { sumLosses += losVal; countLosses++; }

    const costVal = parseVal(row[costKey]);
    if (costVal !== null) { sumCost += costVal; countCost++; }

    const loadVal = parseVal(row[loadingKey]);
    if (loadVal !== null) { sumLoading += loadVal; countLoading++; }

    const pfVal = parseVal(row[pfKey]);
    if (pfVal !== null) { sumPf += pfVal; countPf++; }

    const lfVal = parseVal(row[loadFactorKey]);
    if (lfVal !== null) { sumLoadFactor += lfVal; countLoadFactor++; }
  });

  const avgPercentLoading = countLoading > 0 ? (sumLoading / countLoading).toFixed(2) : "0.00";
  const avgPowerFactorLt = countPf > 0 ? (sumPf / countPf).toFixed(4) : "0.0000";
  const avgLoadFactor = countLoadFactor > 0 ? (sumLoadFactor / countLoadFactor).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    totalEnergySupplied: sumSupplied.toFixed(2),
    totalEnergyLosses: sumLosses.toFixed(2),
    totalCostOfLosses: sumCost.toFixed(2),
    avgPercentLoading,
    avgPowerFactorLt,
    avgLoadFactor,
  };
}
