export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface SolarGenerationKpiResult {
  totalRecords: number;
  totalImport: string;
  totalExport: string;
  totalNet: string;
  totalGeneration: string;
  avgGenerationPerDay: string;
  avgSpecificGeneration: string;
}

export function calculateSolarGenerationKpi(columns: SheetColumn[], rows: SheetRow[]): SolarGenerationKpiResult {
  let sumImport = 0, countImport = 0;
  let sumExport = 0, countExport = 0;
  let sumGeneration = 0, countGeneration = 0;
  let sumPlantRating = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const importKey = findKey("import kwh") || "import_kWh";
  const exportKey = findKey("export kwh") || "export_kWh";
  const generationKey = findKey("solar generation kwh") || findKey("solar_generation_kWh") || "solar_generation_kWh";
  const plantRatingKey = findKey("plant rating") || findKey("rating") || "solar_plant_id.rating_kWp";

  // Track unique solar plants to get total capacity (kWp)
  const plantCapacityMap = new Map<string, number>();
  const plantIdKey = "solar_plant_id._id" || "solar_plant_id";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const impVal = parseVal(row[importKey]);
    if (impVal !== null) { sumImport += impVal; countImport++; }

    const expVal = parseVal(row[exportKey]);
    if (expVal !== null) { sumExport += expVal; countExport++; }

    const genVal = parseVal(row[generationKey]);
    if (genVal !== null) { sumGeneration += genVal; countGeneration++; }

    // Aggregate rating_kWp per unique plant
    const plantId = String(row[plantIdKey] || row.solar_plant_id || "default");
    const ratingVal = parseVal(row[plantRatingKey]);
    if (ratingVal !== null && !plantCapacityMap.has(plantId)) {
      plantCapacityMap.set(plantId, ratingVal);
    }
  });

  // Sum capacities
  plantCapacityMap.forEach((cap) => {
    sumPlantRating += cap;
  });

  const totalNet = (sumImport - sumExport).toFixed(2);
  const avgGenerationPerDay = countGeneration > 0 ? (sumGeneration / countGeneration).toFixed(2) : "0.00";
  const avgSpecificGeneration = sumPlantRating > 0 ? (sumGeneration / sumPlantRating).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    totalImport: sumImport.toFixed(2),
    totalExport: sumExport.toFixed(2),
    totalNet,
    totalGeneration: sumGeneration.toFixed(2),
    avgGenerationPerDay,
    avgSpecificGeneration,
  };
}
