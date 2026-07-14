export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface DgSetRecordKpiResult {
  totalRecords: number;
  avgKwOutput: string;
  avgKvaOutput: string;
  avgPf: string;
  avgDgCost: string;
  avgGridCost: string;
  avgLoading: string;
  avgSfc: string;
  avgEfficiency: string;
}

export function calculateDgSetRecordKpi(columns: SheetColumn[], rows: SheetRow[]): DgSetRecordKpiResult {
  let sumKw = 0, countKw = 0;
  let sumKva = 0, countKva = 0;
  let sumPf = 0, countPf = 0;
  let sumDgCost = 0, countDgCost = 0;
  let sumGridCost = 0, countGridCost = 0;
  let sumLoading = 0, countLoading = 0;
  let sumSfc = 0, countSfc = 0;
  let sumEff = 0, countEff = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const kwOutputKey = findKey("measured kw output") || "measured_kW_output";
  const kvaOutputKey = findKey("measured kva output") || "measured_kVA_output";
  const pfKey = findKey("power factor") || "power_factor";
  const dgCostKey = findKey("dg cost per kwh") || "dg_cost_per_kWh_rs";
  const gridCostKey = findKey("grid cost per kwh") || "grid_cost_per_kWh_rs";
  const loadingKey = findKey("average loading") || "average_loading_percent";
  const sfcKey = findKey("specific fuel consumption") || "specific_fuel_consumption_l_per_kWh";
  const efficiencyKey = findKey("calculated efficiency") || "calculated_efficiency_percent";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const kwVal = parseVal(row[kwOutputKey]);
    if (kwVal !== null) { sumKw += kwVal; countKw++; }

    const kvaVal = parseVal(row[kvaOutputKey]);
    if (kvaVal !== null) { sumKva += kvaVal; countKva++; }

    const pfVal = parseVal(row[pfKey]);
    if (pfVal !== null) { sumPf += pfVal; countPf++; }

    const dgCostVal = parseVal(row[dgCostKey]);
    if (dgCostVal !== null) { sumDgCost += dgCostVal; countDgCost++; }

    const gridCostVal = parseVal(row[gridCostKey]);
    if (gridCostVal !== null) { sumGridCost += gridCostVal; countGridCost++; }

    const loadingVal = parseVal(row[loadingKey]);
    if (loadingVal !== null) { sumLoading += loadingVal; countLoading++; }

    const sfcVal = parseVal(row[sfcKey]);
    if (sfcVal !== null) { sumSfc += sfcVal; countSfc++; }

    const effVal = parseVal(row[efficiencyKey]);
    if (effVal !== null) { sumEff += effVal; countEff++; }
  });

  const avgKwOutput = countKw > 0 ? (sumKw / countKw).toFixed(2) : "0.00";
  const avgKvaOutput = countKva > 0 ? (sumKva / countKva).toFixed(2) : "0.00";
  const avgPf = countPf > 0 ? (sumPf / countPf).toFixed(4) : "0.0000";
  const avgDgCost = countDgCost > 0 ? (sumDgCost / countDgCost).toFixed(2) : "0.00";
  const avgGridCost = countGridCost > 0 ? (sumGridCost / countGridCost).toFixed(2) : "0.00";
  const avgLoading = countLoading > 0 ? (sumLoading / countLoading).toFixed(2) : "0.00";
  const avgSfc = countSfc > 0 ? (sumSfc / countSfc).toFixed(3) : "0.000";
  const avgEfficiency = countEff > 0 ? (sumEff / countEff).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    avgKwOutput,
    avgKvaOutput,
    avgPf,
    avgDgCost,
    avgGridCost,
    avgLoading,
    avgSfc,
    avgEfficiency,
  };
}
