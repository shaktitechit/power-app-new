export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface DgSetKpiResult {
  totalSets: number;
  totalCapacityKva: string;
  totalActivePowerKw: string;
  avgYear: string;
}

export function calculateDgSetKpi(columns: SheetColumn[], rows: SheetRow[]): DgSetKpiResult {
  let sumCapacity = 0, countCapacity = 0;
  let sumPower = 0, countPower = 0;
  let sumYear = 0, countYear = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const capacityKey = findKey("rated capacity") || "rated_capacity_kVA";
  const activePowerKey = findKey("active power") || "rated_active_power_kW";
  const yearKey = findKey("year") || "year_of_installation";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const capVal = parseVal(row[capacityKey]);
    if (capVal !== null) { sumCapacity += capVal; countCapacity++; }

    const pwrVal = parseVal(row[activePowerKey]);
    if (pwrVal !== null) { sumPower += pwrVal; countPower++; }

    const yrVal = parseVal(row[yearKey]);
    if (yrVal !== null && yrVal > 1900) { sumYear += yrVal; countYear++; }
  });

  const avgYear = countYear > 0 ? (sumYear / countYear).toFixed(0) : "—";

  return {
    totalSets: rows.length,
    totalCapacityKva: sumCapacity.toFixed(2),
    totalActivePowerKw: sumPower.toFixed(2),
    avgYear,
  };
}
