export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface PumpRecordKpiResult {
  totalRecords: number;
  totalDailyEnergy: string;
  totalAnnualEnergy: string;
  avgInputPower: string;
  avgEfficiency: string;
  avgMotorLoading: string;
  avgSpecificEnergy: string;
  avgActualFlow: string;
  vfdCount: number;
  throttlingCount: number;
  leakageCount: number;
}

export function calculatePumpRecordKpi(columns: SheetColumn[], rows: SheetRow[]): PumpRecordKpiResult {
  let sumDailyEnergy = 0, countDailyEnergy = 0;
  let sumAnnualEnergy = 0, countAnnualEnergy = 0;
  let sumInputPower = 0, countInputPower = 0;
  let sumEfficiency = 0, countEfficiency = 0;
  let sumMotorLoading = 0, countMotorLoading = 0;
  let sumSpecificEnergy = 0, countSpecificEnergy = 0;
  let sumActualFlow = 0, countActualFlow = 0;
  let vfdCount = 0;
  let throttlingCount = 0;
  let leakageCount = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const dailyEnergyKey = findKey("daily energy consumption") || "daily_energy_consumption_kWh";
  const annualEnergyKey = findKey("annual energy consumption") || "annual_energy_consumption_kWh";
  const inputPowerKey = findKey("input power") || "input_power_kW";
  const efficiencyKey = findKey("efficiency") || "overall_pump_set_efficiency_percent";
  const motorLoadingKey = findKey("motor loading") || "motor_loading_percent";
  const specificEnergyKey = findKey("specific energy") || "specific_energy_consumption_kWh_per_m3";
  const actualFlowKey = findKey("actual flow") || "actual_flow_m3_per_hr";
  const vfdKey = findKey("vfd") || "vfd_installed";
  const throttlingKey = findKey("valve throttling") || "control_valve_throttling";
  const leakageKey = findKey("leakages") || "leakages_observed";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const isTrueVal = (val: any) => {
      if (val === true || String(val).toLowerCase() === "true" || String(val).toLowerCase() === "yes" || String(val).toLowerCase() === "y") {
        return true;
      }
      return false;
    };

    const dailyVal = parseVal(row[dailyEnergyKey]);
    if (dailyVal !== null) { sumDailyEnergy += dailyVal; countDailyEnergy++; }

    const annualVal = parseVal(row[annualEnergyKey]);
    if (annualVal !== null) { sumAnnualEnergy += annualVal; countAnnualEnergy++; }

    const inputVal = parseVal(row[inputPowerKey]);
    if (inputVal !== null) { sumInputPower += inputVal; countInputPower++; }

    const effVal = parseVal(row[efficiencyKey]);
    if (effVal !== null) { sumEfficiency += effVal; countEfficiency++; }

    const loadingVal = parseVal(row[motorLoadingKey]);
    if (loadingVal !== null) { sumMotorLoading += loadingVal; countMotorLoading++; }

    const specVal = parseVal(row[specificEnergyKey]);
    if (specVal !== null) { sumSpecificEnergy += specVal; countSpecificEnergy++; }

    const flowVal = parseVal(row[actualFlowKey]);
    if (flowVal !== null) { sumActualFlow += flowVal; countActualFlow++; }

    if (isTrueVal(row[vfdKey])) { vfdCount++; }
    if (isTrueVal(row[throttlingKey])) { throttlingCount++; }
    if (isTrueVal(row[leakageKey])) { leakageCount++; }
  });

  const avgInputPower = countInputPower > 0 ? (sumInputPower / countInputPower).toFixed(2) : "0.00";
  const avgEfficiency = countEfficiency > 0 ? (sumEfficiency / countEfficiency).toFixed(2) : "0.00";
  const avgMotorLoading = countMotorLoading > 0 ? (sumMotorLoading / countMotorLoading).toFixed(2) : "0.00";
  const avgSpecificEnergy = countSpecificEnergy > 0 ? (sumSpecificEnergy / countSpecificEnergy).toFixed(2) : "0.00";
  const avgActualFlow = countActualFlow > 0 ? (sumActualFlow / countActualFlow).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    totalDailyEnergy: sumDailyEnergy.toFixed(2),
    totalAnnualEnergy: sumAnnualEnergy.toFixed(2),
    avgInputPower,
    avgEfficiency,
    avgMotorLoading,
    avgSpecificEnergy,
    avgActualFlow,
    vfdCount,
    throttlingCount,
    leakageCount,
  };
}
