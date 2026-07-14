export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface SolarKpiResult {
  totalPlants: number;
  totalCapacityKwWp: string;
  totalPanels: string;
  totalInverterCapacity: string;
  avgPanelRating: string;
}

export function calculateSolarKpi(columns: SheetColumn[], rows: SheetRow[]): SolarKpiResult {
  let sumCapacity = 0, countCapacity = 0;
  let sumPanels = 0, countPanels = 0;
  let sumInverter = 0, countInverter = 0;
  let sumPanelRating = 0, countPanelRating = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const capacityKey = findKey("rating") || "rating_kWp";
  const panelsKey = findKey("no of panels") || findKey("panels") || "no_of_panels";
  const inverterKey = findKey("inverter rating") || "inverter_rating_kW";
  const panelRatingKey = findKey("panel rating") || "panel_rating_watt";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const capVal = parseVal(row[capacityKey]);
    if (capVal !== null) { sumCapacity += capVal; countCapacity++; }

    const panVal = parseVal(row[panelsKey]);
    if (panVal !== null) { sumPanels += panVal; countPanels++; }

    const invVal = parseVal(row[inverterKey]);
    if (invVal !== null) { sumInverter += invVal; countInverter++; }

    const prVal = parseVal(row[panelRatingKey]);
    if (prVal !== null) { sumPanelRating += prVal; countPanelRating++; }
  });

  const avgPanelRating = countPanelRating > 0 ? (sumPanelRating / countPanelRating).toFixed(2) : "0.00";

  return {
    totalPlants: rows.length,
    totalCapacityKwWp: sumCapacity.toFixed(2),
    totalPanels: sumPanels.toFixed(0),
    totalInverterCapacity: sumInverter.toFixed(2),
    avgPanelRating,
  };
}
