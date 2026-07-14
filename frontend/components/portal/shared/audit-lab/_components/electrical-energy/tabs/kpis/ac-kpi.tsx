export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface AcKpiResult {
  totalRecords: number;
  totalLoad: string;
  totalAnnualEnergy: string;
  avgSpecificPower: string;
}

export function calculateAcKpi(columns: SheetColumn[], rows: SheetRow[]): AcKpiResult {
  let sumLoad = 0, countLoad = 0;
  let sumAnnualEnergy = 0, countAnnualEnergy = 0;
  let sumSpecificPower = 0, countSpecificPower = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const loadKey = findKey("connected load") || "connected_load_kW";
  const annualEnergyKey = findKey("annual energy consumption") || "annual_energy_consumption_kWh";
  const specificPowerKey = findKey("specific power") || "specific_power_kW_per_TR";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const loadVal = parseVal(row[loadKey]);
    if (loadVal !== null) { sumLoad += loadVal; countLoad++; }

    const energyVal = parseVal(row[annualEnergyKey]);
    if (energyVal !== null) { sumAnnualEnergy += energyVal; countAnnualEnergy++; }

    const specificVal = parseVal(row[specificPowerKey]);
    if (specificVal !== null) { sumSpecificPower += specificVal; countSpecificPower++; }
  });

  const totalLoad = sumLoad.toFixed(2);
  const totalAnnualEnergy = sumAnnualEnergy.toFixed(2);
  const avgSpecificPower = countSpecificPower > 0 ? (sumSpecificPower / countSpecificPower).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    totalLoad,
    totalAnnualEnergy,
    avgSpecificPower,
  };
}
