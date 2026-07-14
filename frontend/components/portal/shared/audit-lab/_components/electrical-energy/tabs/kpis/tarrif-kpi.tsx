export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface TariffKpiResult {
  total: number;
  current: number;
  historical: number;
  avgEnergy: string;
  avgFixed: string;
}

export function calculateTariffKpi(columns: SheetColumn[], rows: SheetRow[]): TariffKpiResult {
  let currentCount = 0;
  let historicalCount = 0;
  let sumEnergyCharges = 0;
  let countEnergyCharges = 0;
  let sumFixedCharges = 0;
  let countFixedCharges = 0;

  const energyKey = columns.find((c) => c.label.toLowerCase().includes("energy charges"))?.key;
  const fixedKey = columns.find((c) => c.label.toLowerCase().includes("fixed charges"))?.key;

  rows.forEach((row) => {
    const toDateStr = row.effective_to;
    const hasEffectiveTo = toDateStr && toDateStr !== "—" && toDateStr !== "";

    if (hasEffectiveTo) {
      historicalCount++;
    } else {
      currentCount++;
    }

    if (energyKey) {
      const rawVal = String(row[energyKey] ?? "").replace(/[^0-9.]/g, "");
      const ecVal = parseFloat(rawVal);
      if (!isNaN(ecVal)) {
        sumEnergyCharges += ecVal;
        countEnergyCharges++;
      }
    }
    if (fixedKey) {
      const rawVal = String(row[fixedKey] ?? "").replace(/[^0-9.]/g, "");
      const fcVal = parseFloat(rawVal);
      if (!isNaN(fcVal)) {
        sumFixedCharges += fcVal;
        countFixedCharges++;
      }
    }
  });

  const avgEnergy = countEnergyCharges > 0 ? (sumEnergyCharges / countEnergyCharges).toFixed(2) : "0.00";
  const avgFixed = countFixedCharges > 0 ? (sumFixedCharges / countFixedCharges).toFixed(2) : "0.00";

  return {
    total: rows.length,
    current: currentCount,
    historical: historicalCount,
    avgEnergy,
    avgFixed,
  };
}
