export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface PumpKpiResult {
  totalPumps: number;
  totalPower: string;
  totalFlow: string;
  avgHead: string;
}

export function calculatePumpKpi(columns: SheetColumn[], rows: SheetRow[]): PumpKpiResult {
  let sumPower = 0, countPower = 0;
  let sumFlow = 0, countFlow = 0;
  let sumHead = 0, countHead = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const powerKey = findKey("rated power") || "rated_power_kW_or_HP";
  const flowKey = findKey("rated flow") || "rated_flow_m3_per_hr";
  const headKey = findKey("rated head") || "rated_head_m";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const pwrVal = parseVal(row[powerKey]);
    if (pwrVal !== null) { sumPower += pwrVal; countPower++; }

    const flowVal = parseVal(row[flowKey]);
    if (flowVal !== null) { sumFlow += flowVal; countFlow++; }

    const hdVal = parseVal(row[headKey]);
    if (hdVal !== null) { sumHead += hdVal; countHead++; }
  });

  const avgHead = countHead > 0 ? (sumHead / countHead).toFixed(2) : "0.00";

  return {
    totalPumps: rows.length,
    totalPower: sumPower.toFixed(2),
    totalFlow: sumFlow.toFixed(2),
    avgHead,
  };
}
