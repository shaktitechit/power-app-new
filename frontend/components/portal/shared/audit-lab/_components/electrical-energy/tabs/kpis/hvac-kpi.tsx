export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface HvacKpiResult {
  totalRecords: number;
  avgCooling: string;
  avgChillerPower: string;
  avgAuxPower: string;
  avgPlantPower: string;
  avgEfficiency: string;
  avgCop: string;
}

export function calculateHvacKpi(columns: SheetColumn[], rows: SheetRow[]): HvacKpiResult {
  let sumCooling = 0, countCooling = 0;
  let sumChillerPower = 0, countChillerPower = 0;
  let sumAuxPower = 0, countAuxPower = 0;
  let sumPlantPower = 0, countPlantPower = 0;
  let sumEfficiency = 0, countEfficiency = 0;
  let sumCop = 0, countCop = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const coolingKey = findKey("cooling produced") || "summary.average_cooling_produced_TR";
  const chillerPowerKey = findKey("chiller power") || "summary.average_chiller_power_used_kW";
  const auxPowerKey = findKey("auxiliary power") || "summary.total_auxiliary_power_used_kW";
  const plantPowerKey = findKey("plant power") || "summary.total_plant_power_kW";
  const efficiencyKey = findKey("plant efficiency") || "summary.plant_efficiency_kW_per_TR";
  const copKey = findKey("coefficient of performance") || findKey("cop") || "summary.coefficient_of_performance";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const coolingVal = parseVal(row[coolingKey]);
    if (coolingVal !== null) { sumCooling += coolingVal; countCooling++; }

    const chillerVal = parseVal(row[chillerPowerKey]);
    if (chillerVal !== null) { sumChillerPower += chillerVal; countChillerPower++; }

    const auxVal = parseVal(row[auxPowerKey]);
    if (auxVal !== null) { sumAuxPower += auxVal; countAuxPower++; }

    const plantVal = parseVal(row[plantPowerKey]);
    if (plantVal !== null) { sumPlantPower += plantVal; countPlantPower++; }

    const effVal = parseVal(row[efficiencyKey]);
    if (effVal !== null) { sumEfficiency += effVal; countEfficiency++; }

    const copVal = parseVal(row[copKey]);
    if (copVal !== null) { sumCop += copVal; countCop++; }
  });

  const avgCooling = countCooling > 0 ? (sumCooling / countCooling).toFixed(2) : "0.00";
  const avgChillerPower = countChillerPower > 0 ? (sumChillerPower / countChillerPower).toFixed(2) : "0.00";
  const avgAuxPower = countAuxPower > 0 ? (sumAuxPower / countAuxPower).toFixed(2) : "0.00";
  const avgPlantPower = countPlantPower > 0 ? (sumPlantPower / countPlantPower).toFixed(2) : "0.00";
  const avgEfficiency = countEfficiency > 0 ? (sumEfficiency / countEfficiency).toFixed(2) : "0.00";
  const avgCop = countCop > 0 ? (sumCop / countCop).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    avgCooling,
    avgChillerPower,
    avgAuxPower,
    avgPlantPower,
    avgEfficiency,
    avgCop,
  };
}
