import type { UtilityTariff } from "@/store/slices/electrical-audit/utilityTariffApiSlice";
import type { TariffFormState } from "@/components/portal/lib/electrical-audit/utility-tariff-excel";

export type TariffModalFormState = TariffFormState & {
  id?: string;
  isNew: boolean;
};

export const editableInputClass = "bg-background border-border";
export const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

export function createEmptyTariffForm(): TariffModalFormState {
  return {
    isNew: true,
    effective_from: "",
    effective_to: "",
    basic_energy_charges_rs_per_unit: "",
    fixed_charges_rs_per_kW_or_per_kVA: "",
    ed_percent: "",
    octroi_rs_per_unit: "",
    surcharge_rs: "",
    cow_cess_rs: "",
    rental_rs: "",
    infracess_rs: "",
    other_charges_or_rebates_rs: "",
    any_other_rs: "",
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

export function tariffToForm(tariff: UtilityTariff): TariffModalFormState {
  return {
    id: tariff._id,
    isNew: false,
    effective_from: toDateInput(tariff.effective_from),
    effective_to: toDateInput(tariff.effective_to),
    basic_energy_charges_rs_per_unit:
      tariff.basic_energy_charges_rs_per_unit?.toString() || "",
    fixed_charges_rs_per_kW_or_per_kVA:
      tariff.fixed_charges_rs_per_kW_or_per_kVA?.toString() || "",
    ed_percent: tariff.ed_percent?.toString() || "",
    octroi_rs_per_unit: tariff.octroi_rs_per_unit?.toString() || "",
    surcharge_rs: tariff.surcharge_rs?.toString() || "",
    cow_cess_rs: tariff.cow_cess_rs?.toString() || "",
    rental_rs: tariff.rental_rs?.toString() || "",
    infracess_rs: tariff.infracess_rs?.toString() || "",
    other_charges_or_rebates_rs:
      tariff.other_charges_or_rebates_rs?.toString() || "",
    any_other_rs: tariff.any_other_rs?.toString() || "",
  };
}

export function buildTariffPayload(
  form: TariffModalFormState,
  utilityAccountId: string,
) {
  return {
    utility_account_id: utilityAccountId,
    effective_from: form.effective_from,
    effective_to: form.effective_to || null,
    basic_energy_charges_rs_per_unit:
      form.basic_energy_charges_rs_per_unit || undefined,
    fixed_charges_rs_per_kW_or_per_kVA:
      form.fixed_charges_rs_per_kW_or_per_kVA || undefined,
    ed_percent: form.ed_percent || undefined,
    octroi_rs_per_unit: form.octroi_rs_per_unit || undefined,
    surcharge_rs: form.surcharge_rs || undefined,
    cow_cess_rs: form.cow_cess_rs || undefined,
    rental_rs: form.rental_rs || undefined,
    infracess_rs: form.infracess_rs || undefined,
    other_charges_or_rebates_rs: form.other_charges_or_rebates_rs || undefined,
    any_other_rs: form.any_other_rs || undefined,
  };
}

export function formatDisplayValue(value?: string | number | null) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}
