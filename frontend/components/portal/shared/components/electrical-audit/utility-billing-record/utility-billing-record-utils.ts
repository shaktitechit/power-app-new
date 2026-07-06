import type { UtilityBillingRecord } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";

export type BillingFormState = {
  id?: string;
  localId: string;
  isNew: boolean;
  billing_period_start: string;
  billing_period_end: string;
  billing_days: string;
  bill_no: string;
  mdi_kVA: string;
  units_kWh: string;
  units_kVAh: string;
  pf: string;
  fixed_charges_rs: string;
  demand_charges_rs: string;
  energy_charges_rs: string;
  taxes_and_rent_rs: string;
  other_charges_rs: string;
  penalty_rs: string;
  other_charges_remark: string;
  rebate_subsidy_rs: string;
  monthly_electricity_bill_rs: string;
  unit_consumption_per_day_kVAh: string;
  average_per_unit_cost_rs: string;
};

export const editableInputClass = "bg-background border-border";
export const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

function newDraftLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export function createEmptyBillingForm(): BillingFormState {
  return {
    localId: newDraftLocalId(),
    isNew: true,
    billing_period_start: "",
    billing_period_end: "",
    billing_days: "",
    bill_no: "",
    mdi_kVA: "",
    units_kWh: "",
    units_kVAh: "",
    pf: "",
    fixed_charges_rs: "",
    demand_charges_rs: "",
    energy_charges_rs: "",
    taxes_and_rent_rs: "",
    other_charges_rs: "",
    penalty_rs: "",
    other_charges_remark: "",
    rebate_subsidy_rs: "",
    monthly_electricity_bill_rs: "",
    unit_consumption_per_day_kVAh: "",
    average_per_unit_cost_rs: "",
  };
}

export function toDateInput(value?: string | null) {
  if (!value) return "";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  } catch {
    return "";
  }
}

export function sortBillingRecordsStable(
  records: UtilityBillingRecord[],
): UtilityBillingRecord[] {
  return [...records].sort((a, b) => {
    const ta = Date.parse(a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) {
      return ta - tb;
    }
    return String(a._id).localeCompare(String(b._id));
  });
}

export function recordToForm(record: UtilityBillingRecord): BillingFormState {
  return {
    id: record._id,
    localId: record._id,
    isNew: false,
    billing_period_start: toDateInput(record.billing_period_start),
    billing_period_end: toDateInput(record.billing_period_end),
    billing_days: record.billing_days?.toString() || "",
    bill_no: record.bill_no || "",
    mdi_kVA: record.mdi_kVA?.toString() || "",
    units_kWh: record.units_kWh?.toString() || "",
    units_kVAh: record.units_kVAh?.toString() || "",
    pf: record.pf?.toString() || "",
    fixed_charges_rs: record.fixed_charges_rs?.toString() || "",
    demand_charges_rs: record.demand_charges_rs?.toString() || "",
    energy_charges_rs: record.energy_charges_rs?.toString() || "",
    taxes_and_rent_rs: record.taxes_and_rent_rs?.toString() || "",
    other_charges_rs: record.other_charges_rs?.toString() || "",
    penalty_rs: record.penalty_rs?.toString() || "",
    other_charges_remark: record.other_charges_remark || "",
    rebate_subsidy_rs: record.rebate_subsidy_rs?.toString() || "",
    monthly_electricity_bill_rs:
      record.monthly_electricity_bill_rs?.toString() || "",
    unit_consumption_per_day_kVAh:
      record.unit_consumption_per_day_kVAh?.toString() || "",
    average_per_unit_cost_rs: record.average_per_unit_cost_rs?.toString() || "",
  };
}

export const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const roundTo = (value: number, decimals = 2) =>
  Number(value.toFixed(decimals));

const calculateBillingDays = (start: string, end: string) => {
  if (!start || !end) return "";
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }
  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return "";
  return String(Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);
};

const calculatePF = (units_kWh: string, units_kVAh: string) => {
  const kwh = toNumber(units_kWh);
  const kvah = toNumber(units_kVAh);
  if (kwh === undefined || kvah === undefined || kvah <= 0) return "";
  return String(roundTo(kwh / kvah, 3));
};

const calculateMonthlyElectricityBill = (
  fixed: string,
  demand: string,
  energy: string,
  taxes: string,
  other: string,
  penalty: string,
  rebateSubsidy: string,
) => {
  const total =
    (toNumber(fixed) ?? 0) +
    (toNumber(demand) ?? 0) +
    (toNumber(energy) ?? 0) +
    (toNumber(taxes) ?? 0) +
    (toNumber(other) ?? 0) +
    (toNumber(penalty) ?? 0) -
    (toNumber(rebateSubsidy) ?? 0);
  return String(roundTo(total, 2));
};

const calculateUnitConsumptionPerDay = (
  units_kVAh: string,
  billing_days: string,
) => {
  const units = toNumber(units_kVAh);
  const days = toNumber(billing_days);
  if (units === undefined || days === undefined || days <= 0) return "";
  return String(roundTo(units / days, 2));
};

const calculateAveragePerUnitCost = (
  monthlyBill: string,
  units_kVAh: string,
) => {
  const bill = toNumber(monthlyBill);
  const units = toNumber(units_kVAh);
  if (bill === undefined || units === undefined || units <= 0) return "";
  return String(roundTo(bill / units, 2));
};

export const recalculateBillingForm = (
  form: BillingFormState,
): BillingFormState => {
  const updatedForm = { ...form };
  updatedForm.billing_days = calculateBillingDays(
    updatedForm.billing_period_start,
    updatedForm.billing_period_end,
  );
  updatedForm.pf = calculatePF(updatedForm.units_kWh, updatedForm.units_kVAh);
  updatedForm.monthly_electricity_bill_rs = calculateMonthlyElectricityBill(
    updatedForm.fixed_charges_rs,
    updatedForm.demand_charges_rs,
    updatedForm.energy_charges_rs,
    updatedForm.taxes_and_rent_rs,
    updatedForm.other_charges_rs,
    updatedForm.penalty_rs,
    updatedForm.rebate_subsidy_rs,
  );
  updatedForm.unit_consumption_per_day_kVAh = calculateUnitConsumptionPerDay(
    updatedForm.units_kVAh,
    updatedForm.billing_days,
  );
  updatedForm.average_per_unit_cost_rs = calculateAveragePerUnitCost(
    updatedForm.monthly_electricity_bill_rs,
    updatedForm.units_kVAh,
  );
  return updatedForm;
};

export function updateBillingFormField(
  form: BillingFormState,
  key: keyof BillingFormState,
  value: string,
): BillingFormState {
  const updatedForm = { ...form, [key]: value };
  return recalculateBillingForm(updatedForm);
}

export function buildBillingRecordPayload(
  form: BillingFormState,
  utilityAccountId: string,
) {
  return {
    utility_account_id: utilityAccountId,
    billing_period_start: form.billing_period_start.trim(),
    billing_period_end: form.billing_period_end.trim(),
    billing_days: toNumber(form.billing_days),
    bill_no: form.bill_no || undefined,
    mdi_kVA: toNumber(form.mdi_kVA),
    units_kWh: toNumber(form.units_kWh),
    units_kVAh: toNumber(form.units_kVAh),
    pf: toNumber(form.pf),
    fixed_charges_rs: toNumber(form.fixed_charges_rs),
    demand_charges_rs: toNumber(form.demand_charges_rs),
    energy_charges_rs: toNumber(form.energy_charges_rs),
    taxes_and_rent_rs: toNumber(form.taxes_and_rent_rs),
    other_charges_rs: toNumber(form.other_charges_rs),
    penalty_rs: toNumber(form.penalty_rs),
    other_charges_remark: form.other_charges_remark || undefined,
    rebate_subsidy_rs: toNumber(form.rebate_subsidy_rs),
    monthly_electricity_bill_rs: toNumber(form.monthly_electricity_bill_rs),
    unit_consumption_per_day_kVAh: toNumber(form.unit_consumption_per_day_kVAh),
    average_per_unit_cost_rs: toNumber(form.average_per_unit_cost_rs),
  };
}

export function formatDisplayValue(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export function getBillingRecordTabLabel(
  record: UtilityBillingRecord,
  index: number,
) {
  const billNo = record.bill_no?.trim();
  if (billNo) return billNo;
  const start = toDateInput(record.billing_period_start);
  const end = toDateInput(record.billing_period_end);
  if (start || end) return `${start || "?"} → ${end || "?"}`;
  return `Bill ${index + 1}`;
}
