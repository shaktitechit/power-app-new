export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface TransformerKpiResult {
  totalTransformers: number;
  totalCapacityKva: string;
  avgNoLoadLoss: string;
  avgFullLoadLoss: string;
  avgEfficiency: string;
}

export function calculateTransformerKpi(columns: SheetColumn[], rows: SheetRow[]): TransformerKpiResult {
  let sumCapacity = 0, countCapacity = 0;
  let sumNoLoad = 0, countNoLoad = 0;
  let sumFullLoad = 0, countFullLoad = 0;
  let sumEff = 0, countEff = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const capacityKey = findKey("rated capacity") || "rated_capacity_kVA";
  const noLoadKey = findKey("no load loss") || "no_load_loss_kW";
  const fullLoadKey = findKey("full load loss") || "full_load_loss_kW";
  const efficiencyKey = findKey("efficiency") || "nameplate_efficiency_percent";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const capVal = parseVal(row[capacityKey]);
    if (capVal !== null) { sumCapacity += capVal; countCapacity++; }

    const nlVal = parseVal(row[noLoadKey]);
    if (nlVal !== null) { sumNoLoad += nlVal; countNoLoad++; }

    const flVal = parseVal(row[fullLoadKey]);
    if (flVal !== null) { sumFullLoad += flVal; countFullLoad++; }

    const effVal = parseVal(row[efficiencyKey]);
    if (effVal !== null) { sumEff += effVal; countEff++; }
  });

  const avgNoLoadLoss = countNoLoad > 0 ? (sumNoLoad / countNoLoad).toFixed(2) : "0.00";
  const avgFullLoadLoss = countFullLoad > 0 ? (sumFullLoad / countFullLoad).toFixed(2) : "0.00";
  const avgEfficiency = countEff > 0 ? (sumEff / countEff).toFixed(2) : "0.00";

  return {
    totalTransformers: rows.length,
    totalCapacityKva: sumCapacity.toFixed(2),
    avgNoLoadLoss,
    avgFullLoadLoss,
    avgEfficiency,
  };
}
