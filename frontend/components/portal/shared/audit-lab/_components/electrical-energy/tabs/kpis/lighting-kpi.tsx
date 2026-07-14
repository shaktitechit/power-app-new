export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface LightingKpiResult {
  totalRecords: number;
  totalQty: string;
  totalLoad: string;
  totalAnnualEnergy: string;
  avgWattage: string;
}

export function calculateLightingKpi(columns: SheetColumn[], rows: SheetRow[]): LightingKpiResult {
  let sumQty = 0, countQty = 0;
  let sumLoad = 0, countLoad = 0;
  let sumAnnualEnergy = 0, countAnnualEnergy = 0;
  let sumWattage = 0, countWattage = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const qtyKey = findKey("quantity") || "quantity_nos";
  const loadKey = findKey("connected load") || "connected_load_kW";
  const annualEnergyKey = findKey("annual energy") || "annual_energy_kWh";
  const wattageKey = findKey("wattage") || "wattage_W";

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

    const wattVal = parseVal(row[wattageKey]);
    if (wattVal !== null) { sumWattage += wattVal; countWattage++; }
  });

  const totalQty = sumQty.toFixed(0);
  const totalLoad = sumLoad.toFixed(2);
  const totalAnnualEnergy = sumAnnualEnergy.toFixed(2);
  const avgWattage = countWattage > 0 ? (sumWattage / countWattage).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    totalQty,
    totalLoad,
    totalAnnualEnergy,
    avgWattage,
  };
}
