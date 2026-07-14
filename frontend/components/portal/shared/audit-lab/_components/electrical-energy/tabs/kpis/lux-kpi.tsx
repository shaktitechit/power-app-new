export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface LuxKpiResult {
  totalRecords: number;
  compliantCount: number;
  nonCompliantCount: number;
  compliancePercentage: string;
  avgRequiredLux: string;
  avgMeasuredLux: string;
  avgLuxGap: string;
}

export function calculateLuxKpi(columns: SheetColumn[], rows: SheetRow[]): LuxKpiResult {
  let compliantCount = 0;
  let nonCompliantCount = 0;
  let sumRequired = 0, countRequired = 0;
  let sumMeasured = 0, countMeasured = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const requiredKey = findKey("required lux") || "required_lux";
  const averageLuxKey = findKey("average lux") || "average_lux";
  const complianceKey = findKey("compliance") || "compliance";

  rows.forEach((row) => {
    // Compliance parsing
    const compVal = row[complianceKey];
    if (compVal === true || String(compVal).toLowerCase() === "true" || String(compVal).toLowerCase().includes("compliant") && !String(compVal).toLowerCase().includes("non")) {
      compliantCount++;
    } else {
      nonCompliantCount++;
    }

    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.-]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const reqVal = parseVal(row[requiredKey]);
    if (reqVal !== null) {
      sumRequired += reqVal;
      countRequired++;
    }

    const measVal = parseVal(row[averageLuxKey]);
    if (measVal !== null) {
      sumMeasured += measVal;
      countMeasured++;
    }
  });

  const totalRecords = rows.length;
  const compliancePercentage = totalRecords > 0 ? ((compliantCount / totalRecords) * 100).toFixed(2) : "0.00";
  const avgRequiredLux = countRequired > 0 ? (sumRequired / countRequired).toFixed(2) : "0.00";
  const avgMeasuredLux = countMeasured > 0 ? (sumMeasured / countMeasured).toFixed(2) : "0.00";
  const avgLuxGap = (parseFloat(avgMeasuredLux) - parseFloat(avgRequiredLux)).toFixed(2);

  return {
    totalRecords,
    compliantCount,
    nonCompliantCount,
    compliancePercentage,
    avgRequiredLux,
    avgMeasuredLux,
    avgLuxGap,
  };
}
