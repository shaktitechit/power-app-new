import type { LuxMeasurementRecord, CreateLuxMeasurementRequest } from "@/store/slices/electrical-audit/luxMeasurementApiSlice";
import { luxComplianceExcelToBoolean } from "@/components/portal/lib/electrical-audit/lux-measurement-excel";

export type ExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  uploadedAt?: string;
};

export type LuxMeasurementFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  facility_id: string;
  utility_account_id: string;

  area_location: string;
  room_type:
    | ""
    | "office"
    | "corridor"
    | "warehouse"
    | "hospital"
    | "classroom"
    | "outdoor"
    | "other";

  required_lux: string;
  measured_lux_point_1: string;
  measured_lux_point_2: string;
  measured_lux_point_3: string;
  average_lux: string;
  compliance: boolean | undefined;
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

export const computeLuxValues = (form: LuxMeasurementFormState) => {
  const p1 = Number(form.measured_lux_point_1);
  const p2 = Number(form.measured_lux_point_2);
  const p3 = Number(form.measured_lux_point_3);
  const requiredLux = Number(form.required_lux);

  const validPoints = [p1, p2, p3].filter((value) => !Number.isNaN(value));

  let averageLux = "";
  let compliance: boolean | undefined = undefined;

  if (validPoints.length > 0) {
    averageLux = String(
      Number(
        (
          validPoints.reduce((sum, value) => sum + value, 0) /
          validPoints.length
        ).toFixed(2),
      ),
    );
  }

  if (!Number.isNaN(requiredLux) && averageLux !== "") {
    compliance = Number(averageLux) >= requiredLux;
  }

  return {
    ...form,
    average_lux: averageLux,
    compliance,
  };
};

export const createEmptyForm = (
  facilityId: string,
  utilityAccountId: string,
): LuxMeasurementFormState =>
  computeLuxValues({
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isNew: true,
  
    facility_id: facilityId,
    utility_account_id: utilityAccountId,

    area_location: "",
    room_type: "",
    required_lux: "",
    measured_lux_point_1: "",
    measured_lux_point_2: "",
    measured_lux_point_3: "",
    average_lux: "",
    compliance: undefined,
    remarks: "",

    existingDocuments: [],
    newDocuments: [],
  });

export function auditToForm(record: any): LuxMeasurementFormState {
  return computeLuxValues({
    id: record._id,
    localId: record._id,
    isNew: false,

    facility_id: record.facility_id?._id || record.facility_id || "",
    utility_account_id:
      record.utility_account_id?._id || record.utility_account_id || "",

    area_location: record.area_location || "",
    room_type: record.room_type || "",
    required_lux: toStringValue(record.required_lux),
    measured_lux_point_1: toStringValue(record.measured_lux_point_1),
    measured_lux_point_2: toStringValue(record.measured_lux_point_2),
    measured_lux_point_3: toStringValue(record.measured_lux_point_3),
    average_lux: toStringValue(record.average_lux),
    compliance:
      typeof record.compliance === "boolean" ? record.compliance : undefined,
    remarks: record.remarks || "",

    existingDocuments: record.documents || [],
    newDocuments: [],
  });
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildLuxMeasurementPayload(
  form: LuxMeasurementFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateLuxMeasurementRequest {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    area_location: form.area_location || undefined,
    room_type: form.room_type || undefined,
    required_lux: toNumber(form.required_lux),
    measured_lux_point_1: toNumber(form.measured_lux_point_1),
    measured_lux_point_2: toNumber(form.measured_lux_point_2),
    measured_lux_point_3: toNumber(form.measured_lux_point_3),
    average_lux: toNumber(form.average_lux),
    compliance: form.compliance,
    remarks: form.remarks || undefined,
  };
}

export function sortLuxMeasurementsStable(records: LuxMeasurementRecord[]): LuxMeasurementRecord[] {
  return [...records].sort((a, b) => {
    const ta = Date.parse(a.audit_date ?? a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.audit_date ?? b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getLuxMeasurementTabLabel(record: LuxMeasurementRecord, index: number) {
  const area = record.area_location?.trim();
  const prefix = `Lux ${index + 1}`;
  return area ? `${prefix} (${area})` : prefix;
}

export function updateLuxMeasurementForm(
  form: LuxMeasurementFormState,
  updater: (form: LuxMeasurementFormState) => LuxMeasurementFormState,
): LuxMeasurementFormState {
  return computeLuxValues(updater(form));
}

export function applyLuxMeasurementExcelParsed(
  form: LuxMeasurementFormState,
  parsed: Record<string, unknown>,
): LuxMeasurementFormState {
  const next = { ...form } as LuxMeasurementFormState;
  const mutable = next as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    if (k === "compliance") {
      next.compliance = luxComplianceExcelToBoolean(String(v ?? ""));
      continue;
    }
    mutable[k] = v;
  }
  return computeLuxValues(next);
}
