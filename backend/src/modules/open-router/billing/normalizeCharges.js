import {
  CHARGE_CATEGORY_FORM_FIELDS,
  classifyChargeLabel,
} from "./chargeAliases.js";

function toFiniteNumber(value) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/**
 * Sum charge_line_items into utility billing charge fields using CHARGE_ALIASES.
 * @param {Array<{ label?: string, amount?: number | string }>} chargeLineItems
 */
export function normalizeChargesFromLineItems(chargeLineItems = []) {
  const sums = Object.fromEntries(
    Object.keys(CHARGE_CATEGORY_FORM_FIELDS).map((category) => [category, 0]),
  );
  const hasItems = Object.fromEntries(
    Object.keys(CHARGE_CATEGORY_FORM_FIELDS).map((category) => [category, false]),
  );
  const otherLabels = [];

  for (const item of chargeLineItems) {
    const amount = toFiniteNumber(item?.amount);
    const label = String(item?.label || "").trim();
    if (amount === null || !label) {
      continue;
    }

    const category = classifyChargeLabel(label);
    sums[category] += amount;
    hasItems[category] = true;

    if (category === "other") {
      otherLabels.push(label);
    }
  }

  const form = {
    fixed_charges_rs: hasItems.fixed ? sums.fixed : null,
    demand_charges_rs: hasItems.demand ? sums.demand : null,
    energy_charges_rs: hasItems.energy ? sums.energy : null,
    taxes_and_rent_rs: hasItems.taxes ? sums.taxes : null,
    penalty_rs: hasItems.penalty ? sums.penalty : null,
    rebate_subsidy_rs: hasItems.rebate ? sums.rebate : null,
    other_charges_rs: hasItems.other ? sums.other : null,
    other_charges_remark: otherLabels.length > 0 ? otherLabels.join(", ") : null,
  };

  return form;
}

const CHARGE_FORM_FIELDS = [
  "fixed_charges_rs",
  "demand_charges_rs",
  "energy_charges_rs",
  "taxes_and_rent_rs",
  "other_charges_rs",
  "other_charges_remark",
  "penalty_rs",
  "rebate_subsidy_rs",
];

/**
 * Prefer LLM values; fill charge fields from deterministic alias matching when LLM returns null.
 */
export function mergeChargeFields(llmForm, deterministicForm) {
  const merged = { ...llmForm };

  for (const key of CHARGE_FORM_FIELDS) {
    if (merged[key] == null && deterministicForm[key] != null) {
      merged[key] = deterministicForm[key];
    }
  }

  return merged;
}
