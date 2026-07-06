import type { MiscLoadAuditRecord, CreateMiscLoadAuditRequest } from "@/store/slices/electrical-audit/miscLoadAuditApiSlice";

export type ExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  uploadedAt?: string;
};

export type MiscLoadAuditFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  facility_id: string;
  utility_account_id: string;

  equipment_name: string;
  category: string;
  location_department: string;

  quantity: string;
  rated_power_kW: string;
  average_operating_hours_per_day: string;
  operating_days_per_year: string;
  load_factor_percent: string;
  estimated_annual_energy_kWh: string;

  existingDocuments: ExistingDocument[];
  newDocuments: File[];
};

export const editableInputClass =
  "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary";

export const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

export const getInputClass = (disabled: boolean) =>
  disabled ? autoInputClass : editableInputClass;

export const toDateInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
};

const toStringValue = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export const computeMiscLoadValues = (form: MiscLoadAuditFormState) => {
  const quantity = Number(form.quantity);
  const ratedPower = Number(form.rated_power_kW);
  const avgHours = Number(form.average_operating_hours_per_day);
  const operatingDays = Number(form.operating_days_per_year);
  const loadFactorPercent = Number(form.load_factor_percent);

  const validQuantity = Number.isNaN(quantity) ? 0 : quantity;
  const validRatedPower = Number.isNaN(ratedPower) ? 0 : ratedPower;
  const validAvgHours = Number.isNaN(avgHours) ? 0 : avgHours;
  const validOperatingDays = Number.isNaN(operatingDays) ? 0 : operatingDays;
  const validLoadFactorPercent = Number.isNaN(loadFactorPercent)
    ? 100
    : loadFactorPercent;

  const estimatedAnnualEnergy =
    validQuantity *
    validRatedPower *
    validAvgHours *
    validOperatingDays *
    (validLoadFactorPercent / 100);

  return {
    ...form,
    estimated_annual_energy_kWh:
      estimatedAnnualEnergy > 0
        ? String(Number(estimatedAnnualEnergy.toFixed(2)))
        : "",
  };
};

export const createEmptyForm = (
  facilityId: string,
  utilityAccountId: string,
): MiscLoadAuditFormState =>
  computeMiscLoadValues({
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isNew: true,
  
    facility_id: facilityId,
    utility_account_id: utilityAccountId,

    equipment_name: "",
    category: "",
    location_department: "",

    quantity: "",
    rated_power_kW: "",
    average_operating_hours_per_day: "",
    operating_days_per_year: "",
    load_factor_percent: "100",
    estimated_annual_energy_kWh: "",

    existingDocuments: [],
    newDocuments: [],
  });

export function auditToForm(record: any): MiscLoadAuditFormState {
  return computeMiscLoadValues({
    id: record._id,
    localId: record._id,
    isNew: false,

    facility_id: record.facility_id?._id || record.facility_id || "",
    utility_account_id:
      record.utility_account_id?._id || record.utility_account_id || "",

    equipment_name: record.equipment_name || "",
    category: record.category || "",
    location_department: record.location_department || "",

    quantity: toStringValue(record.quantity),
    rated_power_kW: toStringValue(record.rated_power_kW),
    average_operating_hours_per_day: toStringValue(
      record.average_operating_hours_per_day,
    ),
    operating_days_per_year: toStringValue(record.operating_days_per_year),
    load_factor_percent: toStringValue(record.load_factor_percent),
    estimated_annual_energy_kWh: toStringValue(
      record.estimated_annual_energy_kWh,
    ),

    existingDocuments: record.documents || [],
    newDocuments: [],
  });
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildMiscLoadAuditPayload(
  form: MiscLoadAuditFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateMiscLoadAuditRequest {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    equipment_name: form.equipment_name,
    category: form.category || undefined,
    location_department: form.location_department || undefined,
    quantity: toNumber(form.quantity),
    rated_power_kW: toNumber(form.rated_power_kW),
    average_operating_hours_per_day: toNumber(form.average_operating_hours_per_day),
    operating_days_per_year: toNumber(form.operating_days_per_year),
    load_factor_percent: toNumber(form.load_factor_percent),
    estimated_annual_energy_kWh: toNumber(form.estimated_annual_energy_kWh),
  };
}

export function sortMiscLoadAuditsStable(records: MiscLoadAuditRecord[]): MiscLoadAuditRecord[] {
  return [...records].sort((a, b) => {
    const ta = Date.parse(a.audit_date ?? a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.audit_date ?? b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getMiscLoadAuditTabLabel(record: MiscLoadAuditRecord, index: number) {
  const equipment = record.equipment_name?.trim();
  const prefix = `Misc ${index + 1}`;
  return equipment ? `${prefix} (${equipment})` : prefix;
}

export function updateMiscLoadAuditForm(
  form: MiscLoadAuditFormState,
  updater: (form: MiscLoadAuditFormState) => MiscLoadAuditFormState,
): MiscLoadAuditFormState {
  return computeMiscLoadValues(updater(form));
}

export function applyMiscLoadAuditExcelParsed(
  form: MiscLoadAuditFormState,
  parsed: Record<string, unknown>,
): MiscLoadAuditFormState {
  const next = { ...form } as MiscLoadAuditFormState;
  const mutable = next as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    mutable[k] = v;
  }
  return computeMiscLoadValues(next);
}
