export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface FanKpiResult {
  totalRecords: number;
  totalQty: string;
  totalLoad: string;
  totalAnnualEnergy: string;
  avgRatedPower: string;
  avgMeasuredPower: string;
  avgLoadingFactor: string;
}

export function calculateFanKpi(columns: SheetColumn[], rows: SheetRow[]): FanKpiResult {
  let sumQty = 0, countQty = 0;
  let sumLoad = 0, countLoad = 0;
  let sumAnnualEnergy = 0, countAnnualEnergy = 0;
  let sumRatedPower = 0, countRatedPower = 0;
  let sumMeasuredPower = 0, countMeasuredPower = 0;
  let sumLoadingFactor = 0, countLoadingFactor = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const qtyKey = findKey("quantity") || "quantity_nos";
  const loadKey = findKey("connected load") || "connected_load_kW";
  const annualEnergyKey = findKey("annual energy consumption") || "annual_energy_consumption_kWh";
  const ratedPowerKey = findKey("rated power") || "rated_power_W";
  const measuredPowerKey = findKey("measured power") || "measured_power_W";
  const loadingFactorKey = findKey("loading factor") || "loading_factor_percent";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const qtyVal = parseVal(row[qtyKey]);
    if (qtyVal !== null) { sumQty += qtyVal; countQty++; }

    const loadVal = parseVal(row[loadKey]);
    if (loadVal !== null) { sumLoad += loadVal; countLoad++; }

    const energyVal = parseVal(row[annualEnergyKey]);
    if (energyVal !== null) { sumAnnualEnergy += energyVal; countAnnualEnergy++; }

    const ratedVal = parseVal(row[ratedPowerKey]);
    if (ratedVal !== null) { sumRatedPower += ratedVal; countRatedPower++; }

    const measuredVal = parseVal(row[measuredPowerKey]);
    if (measuredVal !== null) { sumMeasuredPower += measuredVal; countMeasuredPower++; }

    const loadingVal = parseVal(row[loadingFactorKey]);
    if (loadingVal !== null) { sumLoadingFactor += loadingVal; countLoadingFactor++; }
  });

  const totalQty = sumQty.toFixed(0);
  const totalLoad = sumLoad.toFixed(2);
  const totalAnnualEnergy = sumAnnualEnergy.toFixed(2);
  const avgRatedPower = countRatedPower > 0 ? (sumRatedPower / countRatedPower).toFixed(2) : "0.00";
  const avgMeasuredPower = countMeasuredPower > 0 ? (sumMeasuredPower / countMeasuredPower).toFixed(2) : "0.00";
  const avgLoadingFactor = countLoadingFactor > 0 ? (sumLoadingFactor / countLoadingFactor).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    totalQty,
    totalLoad,
    totalAnnualEnergy,
    avgRatedPower,
    avgMeasuredPower,
    avgLoadingFactor,
  };
}
