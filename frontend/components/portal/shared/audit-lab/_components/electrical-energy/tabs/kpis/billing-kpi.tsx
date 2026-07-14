export type SheetColumn = {
  key: string;
  label: string;
  width?: number;
  type?: "text" | "number" | "boolean";
};

export type SheetRow = Record<string, any>;

interface BillingKpiResult {
  totalAccounts: number;
  totalRecords: number;
  totalBill: string;
  totalKwh: string;
  totalKvah: string;
  totalFixed: string;
  totalDemand: string;
  totalEnergy: string;
  totalTaxesRent: string;
  totalOther: string;
  totalPenalty: string;
  totalRebate: string;
  avgBill: string;
  avgKwh: string;
  avgKvah: string;
  avgMdi: string;
  avgPf: string;
  latestPeriodEnd: string;
  gridCostKvah: string;
  gridCostKwh: string;
}

export function calculateBillingKpi(columns: SheetColumn[], rows: SheetRow[]): BillingKpiResult {
  const accountsSet = new Set<string>();

  let sumBill = 0, countBill = 0;
  let sumKwh = 0, countKwh = 0;
  let sumKvah = 0, countKvah = 0;
  let sumFixed = 0, countFixed = 0;
  let sumDemand = 0, countDemand = 0;
  let sumEnergy = 0, countEnergy = 0;
  let sumTaxesRent = 0, countTaxesRent = 0;
  let sumOther = 0, countOther = 0;
  let sumPenalty = 0, countPenalty = 0;
  let sumRebate = 0, countRebate = 0;
  let sumMdi = 0, countMdi = 0;
  let sumPf = 0, countPf = 0;
  let maxPeriodEnd: Date | null = null;

  // Resolve column keys dynamically via label matching
  const findKey = (labelSub: string) =>
    columns.find((c) => c.label.toLowerCase().includes(labelSub))?.key;

  const billKey = findKey("monthly electricity bill") || findKey("bill") || "monthly_electricity_bill_rs";
  const kwhKey = findKey("units (kwh)") || findKey("kwh") || "units_kWh";
  const kvahKey = findKey("units (kvah)") || findKey("kvah") || "units_kVAh";
  const fixedKey = findKey("fixed charges") || "fixed_charges_rs";
  const demandKey = findKey("demand charges") || "demand_charges_rs";
  const energyKey = findKey("energy charges") || "energy_charges_rs";
  const taxesRentKey = findKey("taxes and rent") || "taxes_and_rent_rs";
  const otherChargesKey = findKey("other charges") || "other_charges_rs";
  const penaltyKey = findKey("penalty") || "penalty_rs";
  const rebateKey = findKey("rebate / subsidy") || findKey("subsidy") || "rebate_subsidy_rs";
  const mdiKey = findKey("mdi") || "mdi_kVA";
  const pfKey = findKey("pf") || "pf";
  const periodEndKey = findKey("period end") || "billing_period_end";
  const accNumKey = findKey("account number") || "account_number";

  rows.forEach((row) => {
    // Account Number tracking
    const accNum = String(row[accNumKey] || "").trim();
    if (accNum && accNum !== "—") {
      accountsSet.add(accNum);
    }

    // Latest billing period end
    const periodEndStr = row[periodEndKey];
    if (periodEndStr && periodEndStr !== "—") {
      const d = new Date(periodEndStr);
      if (!isNaN(d.getTime())) {
        if (!maxPeriodEnd || d > maxPeriodEnd) {
          maxPeriodEnd = d;
        }
      }
    }

    const parseVal = (val: any) => {
      const parsed = parseFloat(String(val ?? "").replace(/[^0-9.]/g, ""));
      return isNaN(parsed) ? null : parsed;
    };

    const billVal = parseVal(row[billKey]);
    if (billVal !== null) { sumBill += billVal; countBill++; }

    const kwhVal = parseVal(row[kwhKey]);
    if (kwhVal !== null) { sumKwh += kwhVal; countKwh++; }

    const kvahVal = parseVal(row[kvahKey]);
    if (kvahVal !== null) { sumKvah += kvahVal; countKvah++; }

    const fixedVal = parseVal(row[fixedKey]);
    if (fixedVal !== null) { sumFixed += fixedVal; countFixed++; }

    const demandVal = parseVal(row[demandKey]);
    if (demandVal !== null) { sumDemand += demandVal; countDemand++; }

    const energyVal = parseVal(row[energyKey]);
    if (energyVal !== null) { sumEnergy += energyVal; countEnergy++; }

    const taxesRentVal = parseVal(row[taxesRentKey]);
    if (taxesRentVal !== null) { sumTaxesRent += taxesRentVal; countTaxesRent++; }

    const otherVal = parseVal(row[otherChargesKey]);
    if (otherVal !== null) { sumOther += otherVal; countOther++; }

    const penaltyVal = parseVal(row[penaltyKey]);
    if (penaltyVal !== null) { sumPenalty += penaltyVal; countPenalty++; }

    const rebateVal = parseVal(row[rebateKey]);
    if (rebateVal !== null) { sumRebate += rebateVal; countRebate++; }

    const mdiVal = parseVal(row[mdiKey]);
    if (mdiVal !== null) { sumMdi += mdiVal; countMdi++; }

    const pfVal = parseVal(row[pfKey]);
    if (pfVal !== null) { sumPf += pfVal; countPf++; }
  });

  const avgBill = countBill > 0 ? (sumBill / countBill).toFixed(2) : "0.00";
  const avgKwh = countKwh > 0 ? (sumKwh / countKwh).toFixed(2) : "0.00";
  const avgKvah = countKvah > 0 ? (sumKvah / countKvah).toFixed(2) : "0.00";
  const avgMdi = countMdi > 0 ? (sumMdi / countMdi).toFixed(2) : "0.00";
  const avgPf = countPf > 0 ? (sumPf / countPf).toFixed(4) : "0.0000";

  const gridCostKvah = sumKvah > 0 ? (sumBill / sumKvah).toFixed(2) : "0.00";
  const gridCostKwh = sumKwh > 0 ? (sumBill / sumKwh).toFixed(2) : "0.00";

  let latestDateFormatted = "—";
  if (maxPeriodEnd) {
    latestDateFormatted = (maxPeriodEnd as Date).toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return {
    totalAccounts: accountsSet.size || 1, // Fallback to 1 if single account selection and no column available
    totalRecords: rows.length,
    totalBill: sumBill.toFixed(2),
    totalKwh: sumKwh.toFixed(2),
    totalKvah: sumKvah.toFixed(2),
    totalFixed: sumFixed.toFixed(2),
    totalDemand: sumDemand.toFixed(2),
    totalEnergy: sumEnergy.toFixed(2),
    totalTaxesRent: sumTaxesRent.toFixed(2),
    totalOther: sumOther.toFixed(2),
    totalPenalty: sumPenalty.toFixed(2),
    totalRebate: sumRebate.toFixed(2),
    avgBill,
    avgKwh,
    avgKvah,
    avgMdi,
    avgPf,
    latestPeriodEnd: latestDateFormatted,
    gridCostKvah,
    gridCostKwh,
  };
}
