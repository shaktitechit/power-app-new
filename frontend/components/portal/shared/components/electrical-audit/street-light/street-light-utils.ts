import type { StreetLightAuditRecord, CreateStreetLightAuditRequest } from "@/store/slices/electrical-audit/streetLightAuditApiSlice";

export type ExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  caption?: string;
  uploadedAt?: string;
};

export type StreetLightAuditFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  facility_id: string;
  utility_account_id: string;

  area_location: string;
  fixture_type: string;
  lamp_type: string;
  wattage_W: string;
  quantity_nos: string;
  control_type: "" | "manual" | "sensor" | "timer" | "other";
  working_hours_per_day: string;
  working_days_per_year: string;
  connected_load_kW: string;
  annual_energy_kWh: string;
  remarks: string;

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

export const computeStreetLightValues = (form: StreetLightAuditFormState) => {
  const wattage = Number(form.wattage_W);
  const quantity = Number(form.quantity_nos);
  const hoursPerDay = Number(form.working_hours_per_day);
  const daysPerYear = Number(form.working_days_per_year);

  let connectedLoad = "";
  let annualEnergy = "";

  if (!Number.isNaN(wattage) && !Number.isNaN(quantity)) {
    connectedLoad = String(Number(((wattage * quantity) / 1000).toFixed(2)));
  }

  if (
    !Number.isNaN(wattage) &&
    !Number.isNaN(quantity) &&
    !Number.isNaN(hoursPerDay) &&
    !Number.isNaN(daysPerYear)
  ) {
    annualEnergy = String(
      Number(
        (((wattage * quantity) / 1000) * hoursPerDay * daysPerYear).toFixed(2),
      ),
    );
  }

  return {
    ...form,
    connected_load_kW: connectedLoad,
    annual_energy_kWh: annualEnergy,
  };
};

export const createEmptyForm = (
  facilityId: string,
  utilityAccountId: string,
): StreetLightAuditFormState =>
  computeStreetLightValues({
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isNew: true,
  
    facility_id: facilityId,
    utility_account_id: utilityAccountId,

    area_location: "",
    fixture_type: "",
    lamp_type: "",
    wattage_W: "",
    quantity_nos: "",
    control_type: "",
    working_hours_per_day: "",
    working_days_per_year: "",
    connected_load_kW: "",
    annual_energy_kWh: "",
    remarks: "",

    existingDocuments: [],
    newDocuments: [],
  });

export const auditToForm = (record: StreetLightAuditRecord): StreetLightAuditFormState => {
  const facilityRef = record.facility_id as string | { _id?: string };
  const utilityRef = record.utility_account_id as string | { _id?: string };

  return computeStreetLightValues({
    id: record._id,
    localId: record._id,
    isNew: false,

    facility_id:
      typeof facilityRef === "object"
        ? facilityRef._id || ""
        : facilityRef || "",
    utility_account_id:
      typeof utilityRef === "object"
        ? utilityRef._id || ""
        : utilityRef || "",

    area_location: record.area_location || "",
    fixture_type: record.fixture_type || "",
    lamp_type: record.lamp_type || "",
    wattage_W: toStringValue(record.wattage_W),
    quantity_nos: toStringValue(record.quantity_nos),
    control_type: record.control_type || "",
    working_hours_per_day: toStringValue(record.working_hours_per_day),
    working_days_per_year: toStringValue(record.working_days_per_year),
    connected_load_kW: toStringValue(record.connected_load_kW),
    annual_energy_kWh: toStringValue(record.annual_energy_kWh),
    remarks: record.remarks || "",

    existingDocuments: record.documents || [],
    newDocuments: [],
  });
};

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildStreetLightAuditPayload(
  form: StreetLightAuditFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateStreetLightAuditRequest {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    area_location: form.area_location || undefined,
    fixture_type: form.fixture_type || undefined,
    lamp_type: form.lamp_type || undefined,
    wattage_W: toNumber(form.wattage_W),
    quantity_nos: toNumber(form.quantity_nos),
    control_type: form.control_type || undefined,
    working_hours_per_day: toNumber(form.working_hours_per_day),
    working_days_per_year: toNumber(form.working_days_per_year),
    connected_load_kW: toNumber(form.connected_load_kW),
    annual_energy_kWh: toNumber(form.annual_energy_kWh),
    remarks: form.remarks || undefined,
  };
}

export function sortStreetLightAuditsStable(records: StreetLightAuditRecord[]): StreetLightAuditRecord[] {
  return [...records].sort((a, b) => {
    const ta = Date.parse(a.audit_date ?? a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.audit_date ?? b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getStreetLightAuditTabLabel(record: StreetLightAuditRecord, index: number) {
  const area = record.area_location?.trim();
  const prefix = `Street Light ${index + 1}`;
  return area ? `${prefix} (${area})` : prefix;
}

export function updateStreetLightAuditForm(
  form: StreetLightAuditFormState,
  updater: (form: StreetLightAuditFormState) => StreetLightAuditFormState,
): StreetLightAuditFormState {
  return computeStreetLightValues(updater(form));
}

export function applyStreetLightAuditExcelParsed(
  form: StreetLightAuditFormState,
  parsed: Record<string, unknown>,
): StreetLightAuditFormState {
  const next = { ...form } as StreetLightAuditFormState;
  const mutable = next as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    mutable[k] = v;
  }
  return computeStreetLightValues(next);
}
