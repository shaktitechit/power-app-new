export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface MiscKpiResult {
  totalRecords: number;
  totalQty: string;
  totalLoad: string;
  totalAnnualEnergy: string;
  avgRatedPower: string;
  avgLoadFactor: string;
}

export function calculateMiscKpi(columns: SheetColumn[], rows: SheetRow[]): MiscKpiResult {
  let sumQty = 0, countQty = 0;
  let sumLoad = 0, countLoad = 0;
  let sumAnnualEnergy = 0, countAnnualEnergy = 0;
  let sumRatedPower = 0, countRatedPower = 0;
  let sumLoadFactor = 0, countLoadFactor = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const qtyKey = findKey("quantity") || "quantity";
  const ratedPowerKey = findKey("rated power") || "rated_power_kW";
  const annualEnergyKey = findKey("estimated annual energy") || findKey("annual energy") || "estimated_annual_energy_kWh";
  const loadFactorKey = findKey("load factor") || "load_factor_percent";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const qtyVal = parseVal(row[qtyKey]) ?? 1; // Default quantity is 1 if not specified
    const qtyCount = parseVal(row[qtyKey]);
    if (qtyCount !== null) {
      sumQty += qtyCount;
      countQty++;
    }

    const ratedVal = parseVal(row[ratedPowerKey]);
    if (ratedVal !== null) {
      sumRatedPower += ratedVal;
      countRatedPower++;
      sumLoad += ratedVal * qtyVal;
      countLoad++;
    }

    const energyVal = parseVal(row[annualEnergyKey]);
    if (energyVal !== null) {
      sumAnnualEnergy += energyVal;
      countAnnualEnergy++;
    }

    const lfVal = parseVal(row[loadFactorKey]);
    if (lfVal !== null) {
      sumLoadFactor += lfVal;
      countLoadFactor++;
    }
  });

  const totalQty = sumQty.toFixed(0);
  const totalLoad = sumLoad.toFixed(2);
  const totalAnnualEnergy = sumAnnualEnergy.toFixed(2);
  const avgRatedPower = countRatedPower > 0 ? (sumRatedPower / countRatedPower).toFixed(2) : "0.00";
  const avgLoadFactor = countLoadFactor > 0 ? (sumLoadFactor / countLoadFactor).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    totalQty,
    totalLoad,
    totalAnnualEnergy,
    avgRatedPower,
    avgLoadFactor,
  };
}
