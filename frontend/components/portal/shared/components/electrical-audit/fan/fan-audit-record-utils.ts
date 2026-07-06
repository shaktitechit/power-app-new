import type { FanAuditRecord, CreateFanAuditRecordRequest } from "@/store/slices/electrical-audit/fanAuditRecordApiSlice";

export type ExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  uploadedAt?: string;
};

export type FanAuditFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  building_block: string;
  area_location: string;
  fan_type:
    | "ceiling"
    | "exhaust"
    | "pedestal"
    | "wall"
    | "industrial"
    | "other"
    | "";
  make_model: string;

  rated_power_W: string;
  measured_power_W: string;
  quantity_nos: string;

  speed_control_type: "regulator" | "electronic" | "vfd" | "none" | "";

  operating_hours_per_day: string;
  operating_days_per_year: string;

  loading_factor_percent: string;
  connected_load_kW: string;
  annual_energy_consumption_kWh: string;

  condition: "good" | "old" | "inefficient" | "";
  remarks: string;

  audit_date: string;
  auditor_id: string;

  existingDocuments: ExistingDocument[];
  newDocuments: File[];
};

export const editableInputClass =
  "border-input bg-background text-foreground placeholder:text-muted-foreground";
export const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

export const createEmptyForm = (): FanAuditFormState => ({
  localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  isNew: true,

  building_block: "",
  area_location: "",
  fan_type: "",
  make_model: "",

  rated_power_W: "",
  measured_power_W: "",
  quantity_nos: "1",

  speed_control_type: "",

  operating_hours_per_day: "",
  operating_days_per_year: "",

  loading_factor_percent: "",
  connected_load_kW: "",
  annual_energy_consumption_kWh: "",

  condition: "",
  remarks: "",

  audit_date: "",
  auditor_id: "",

  existingDocuments: [],
  newDocuments: [],
});

export function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

const toStringValue = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const round2 = (num: number) => Number(num.toFixed(2));

export const updateComputedValues = (form: FanAuditFormState): FanAuditFormState => {
  const ratedPower = Number(form.rated_power_W);
  const measuredPower = Number(form.measured_power_W);
  const quantity = Number(form.quantity_nos);
  const hoursPerDay = Number(form.operating_hours_per_day);
  const daysPerYear = Number(form.operating_days_per_year);

  const loadingFactor =
    !Number.isNaN(measuredPower) && !Number.isNaN(ratedPower) && ratedPower > 0
      ? round2((measuredPower / ratedPower) * 100)
      : undefined;

  const connectedLoad =
    !Number.isNaN(measuredPower) && !Number.isNaN(quantity)
      ? round2((measuredPower * quantity) / 1000)
      : undefined;

  const annualEnergy =
    connectedLoad !== undefined &&
    !Number.isNaN(hoursPerDay) &&
    !Number.isNaN(daysPerYear)
      ? round2(connectedLoad * hoursPerDay * daysPerYear)
      : undefined;

  return {
    ...form,
    loading_factor_percent:
      loadingFactor !== undefined ? String(loadingFactor) : "",
    connected_load_kW: connectedLoad !== undefined ? String(connectedLoad) : "",
    annual_energy_consumption_kWh:
      annualEnergy !== undefined ? String(annualEnergy) : "",
  };
};

export function auditToForm(record: any): FanAuditFormState {
  return updateComputedValues({
    id: record._id,
    localId: record._id,
    isNew: false,

    building_block: record.building_block || "",
    area_location: record.area_location || "",
    fan_type: record.fan_type || "",
    make_model: record.make_model || "",

    rated_power_W: toStringValue(record.rated_power_W),
    measured_power_W: toStringValue(record.measured_power_W),
    quantity_nos: toStringValue(record.quantity_nos || 1),

    speed_control_type: record.speed_control_type || "",

    operating_hours_per_day: toStringValue(record.operating_hours_per_day),
    operating_days_per_year: toStringValue(record.operating_days_per_year),

    loading_factor_percent: toStringValue(record.loading_factor_percent),
    connected_load_kW: toStringValue(record.connected_load_kW),
    annual_energy_consumption_kWh: toStringValue(
      record.annual_energy_consumption_kWh,
    ),

    condition: record.condition || "",
    remarks: record.remarks || "",

    audit_date: toDateInput(record.audit_date),
    auditor_id: record.auditor_id?._id || record.auditor_id || "",

    existingDocuments: record.documents || [],
    newDocuments: [],
  });
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildFanAuditPayload(
  form: FanAuditFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateFanAuditRecordRequest {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    building_block: form.building_block || undefined,
    area_location: form.area_location || undefined,
    fan_type: form.fan_type || undefined,
    make_model: form.make_model || undefined,
    rated_power_W: toNumber(form.rated_power_W),
    measured_power_W: toNumber(form.measured_power_W),
    quantity_nos: toNumber(form.quantity_nos),
    speed_control_type: form.speed_control_type || undefined,
    operating_hours_per_day: toNumber(form.operating_hours_per_day),
    operating_days_per_year: toNumber(form.operating_days_per_year),
    loading_factor_percent: toNumber(form.loading_factor_percent),
    connected_load_kW: toNumber(form.connected_load_kW),
    annual_energy_consumption_kWh: toNumber(form.annual_energy_consumption_kWh),
    condition: form.condition || undefined,
    remarks: form.remarks || undefined,
    audit_date: form.audit_date || undefined,
    auditor_id: form.auditor_id || undefined,
  };
}

export function sortFanAuditRecordsStable(records: FanAuditRecord[]): FanAuditRecord[] {
  return [...records].sort((a, b) => {
    const ta = Date.parse(a.audit_date ?? a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.audit_date ?? b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getFanAuditTabLabel(record: FanAuditRecord, index: number) {
  const area = record.area_location?.trim();
  const prefix = `Fan ${index + 1}`;
  return area ? `${prefix} (${area})` : prefix;
}

export function updateFanAuditForm(
  form: FanAuditFormState,
  updater: (form: FanAuditFormState) => FanAuditFormState,
): FanAuditFormState {
  return updateComputedValues(updater(form));
}

export function applyFanAuditExcelParsed(
  form: FanAuditFormState,
  parsed: Record<string, unknown>,
): FanAuditFormState {
  const next = { ...form } as FanAuditFormState;
  const mutable = next as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    mutable[k] = v;
  }
  return updateComputedValues(next);
}
