export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface UpsKpiResult {
  totalRecords: number;
  totalCapacity: string;
  totalPower: string;
  avgLoadFactor: string;
  avgBatteryAge: string;
  avgRoomTemp: string;
  avgEfficiency: string;
}

export function calculateUpsKpi(columns: SheetColumn[], rows: SheetRow[]): UpsKpiResult {
  let sumCapacity = 0, countCapacity = 0;
  let sumPower = 0, countPower = 0;
  let sumLoadFactor = 0, countLoadFactor = 0;
  let sumBatteryAge = 0, countBatteryAge = 0;
  let sumRoomTemp = 0, countRoomTemp = 0;
  let sumEff = 0, countEff = 0;

  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const capacityKey = findKey("rated capacity") || "rated_capacity_kVA";
  const powerKey = findKey("rated output power") || "rated_output_power_kW";
  const loadFactorKey = findKey("load factor") || "load_factor";
  const batteryAgeKey = findKey("battery age") || "battery_age_years";
  const roomTempKey = findKey("room temp") || "ups_room_temp_C";
  const inputPowerKey = findKey("input active power") || "input_active_power_kW";
  const outputPowerKey = findKey("output active power") || "output_active_power_kW";

  rows.forEach((row) => {
    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const capVal = parseVal(row[capacityKey]);
    if (capVal !== null) { sumCapacity += capVal; countCapacity++; }

    const pwrVal = parseVal(row[powerKey]);
    if (pwrVal !== null) { sumPower += pwrVal; countPower++; }

    const lfVal = parseVal(row[loadFactorKey]);
    if (lfVal !== null) { sumLoadFactor += lfVal; countLoadFactor++; }

    const batVal = parseVal(row[batteryAgeKey]);
    if (batVal !== null) { sumBatteryAge += batVal; countBatteryAge++; }

    const tempVal = parseVal(row[roomTempKey]);
    if (tempVal !== null) { sumRoomTemp += tempVal; countRoomTemp++; }

    const inpVal = parseVal(row[inputPowerKey]);
    const outVal = parseVal(row[outputPowerKey]);
    if (inpVal !== null && outVal !== null && inpVal > 0) {
      sumEff += (outVal / inpVal) * 100;
      countEff++;
    }
  });

  const totalCapacity = sumCapacity.toFixed(2);
  const totalPower = sumPower.toFixed(2);
  const avgLoadFactor = countLoadFactor > 0 ? (sumLoadFactor / countLoadFactor).toFixed(2) : "0.00";
  const avgBatteryAge = countBatteryAge > 0 ? (sumBatteryAge / countBatteryAge).toFixed(1) : "0.0";
  const avgRoomTemp = countRoomTemp > 0 ? (sumRoomTemp / countRoomTemp).toFixed(1) : "0.0";
  const avgEfficiency = countEff > 0 ? (sumEff / countEff).toFixed(2) : "0.00";

  return {
    totalRecords: rows.length,
    totalCapacity,
    totalPower,
    avgLoadFactor,
    avgBatteryAge,
    avgRoomTemp,
    avgEfficiency,
  };
}
