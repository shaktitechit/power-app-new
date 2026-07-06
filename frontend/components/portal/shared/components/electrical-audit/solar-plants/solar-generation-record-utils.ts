import type { UtilityBillingRecord } from "@/store/slices/electrical-audit/utilityBillingRecordApiSlice";
import type { SolarGenerationRecord } from "@/store/slices/electrical-audit/solarGenerationRecordApiSlice";

export type SolarGenerationExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  caption?: string;
  uploadedAt?: string;
};

export type SolarGenerationFormState = {
  id?: string;
  localId: string;
  isNew: boolean;
  is_completed?: boolean;

  billing_period_start: string;
  billing_period_end: string;
  billing_days: string;
  bill_no: string;

  import_kWh: string;
  import_kVAh: string;
  import_kVA: string;

  export_kWh: string;
  export_kVAh: string;
  export_kVA: string;

  net_kWh: string;
  net_kVAh: string;
  net_kVA: string;

  solar_generation_kWh: string;
  solar_generation_kVAh: string;
  solar_generation_kVA: string;

  documents: File[];
  existingDocuments: SolarGenerationExistingDocument[];
};

export const editableInputClass =
  "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary";

export const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

export const getInputClass = (disabled: boolean) =>
  disabled ? autoInputClass : editableInputClass;

export function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

export function formatBillingPeriodLabel(start: string, end: string) {
  const s = toDateInput(start);
  const e = toDateInput(end);
  if (s && e) return `${s} → ${e}`;
  return s || e || "Billing period";
}

const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export const calculateBillingDays = (start: string, end: string) => {
  if (!start || !end) return "";

  const startDate = new Date(start);
  const endDate = new Date(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "";
  }

  const diffMs = endDate.getTime() - startDate.getTime();
  if (diffMs < 0) return "";

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  return String(diffDays);
};

const calculateNetValue = (importValue: string, exportValue: string) => {
  const importNum = toNumber(importValue);
  const exportNum = toNumber(exportValue);

  if (importNum === undefined && exportNum === undefined) return "";
  return String((importNum || 0) - (exportNum || 0));
};

export const recalculateSolarForm = (
  form: SolarGenerationFormState,
): SolarGenerationFormState => {
  const updated = { ...form };
  updated.billing_days = calculateBillingDays(
    updated.billing_period_start,
    updated.billing_period_end,
  );
  updated.net_kWh = calculateNetValue(updated.import_kWh, updated.export_kWh);
  updated.net_kVAh = calculateNetValue(
    updated.import_kVAh,
    updated.export_kVAh,
  );
  updated.net_kVA = calculateNetValue(updated.import_kVA, updated.export_kVA);
  return updated;
};

export function buildMatchKey(data: {
  billing_period_start?: string;
  billing_period_end?: string;
  bill_no?: string;
}) {
  return [
    toDateInput(data.billing_period_start),
    toDateInput(data.billing_period_end),
    (data.bill_no || "").trim().toLowerCase(),
  ].join("__");
}

export function billingRecordToForm(
  billingRecord: UtilityBillingRecord,
  existingSolarRecord?: SolarGenerationRecord,
): SolarGenerationFormState {
  const billingStart = toDateInput(billingRecord.billing_period_start);
  const billingEnd = toDateInput(billingRecord.billing_period_end);
  const billingDays =
    billingRecord.billing_days?.toString() ||
    calculateBillingDays(billingStart, billingEnd);
  const billNo = billingRecord.bill_no || "";

  return {
    id: existingSolarRecord?._id,
    localId: existingSolarRecord?._id || `bill-${billingRecord._id}`,
    isNew: !existingSolarRecord,
    is_completed: existingSolarRecord?.is_completed,

    billing_period_start: billingStart,
    billing_period_end: billingEnd,
    billing_days: billingDays,
    bill_no: billNo,

    import_kWh: existingSolarRecord?.import_kWh?.toString() || "",
    import_kVAh: existingSolarRecord?.import_kVAh?.toString() || "",
    import_kVA: existingSolarRecord?.import_kVA?.toString() || "",

    export_kWh: existingSolarRecord?.export_kWh?.toString() || "",
    export_kVAh: existingSolarRecord?.export_kVAh?.toString() || "",
    export_kVA: existingSolarRecord?.export_kVA?.toString() || "",

    net_kWh:
      existingSolarRecord?.net_kWh?.toString() ||
      calculateNetValue(
        existingSolarRecord?.import_kWh?.toString() || "",
        existingSolarRecord?.export_kWh?.toString() || "",
      ),
    net_kVAh:
      existingSolarRecord?.net_kVAh?.toString() ||
      calculateNetValue(
        existingSolarRecord?.import_kVAh?.toString() || "",
        existingSolarRecord?.export_kVAh?.toString() || "",
      ),
    net_kVA:
      existingSolarRecord?.net_kVA?.toString() ||
      calculateNetValue(
        existingSolarRecord?.import_kVA?.toString() || "",
        existingSolarRecord?.export_kVA?.toString() || "",
      ),

    solar_generation_kWh:
      existingSolarRecord?.solar_generation_kWh?.toString() || "",
    solar_generation_kVAh:
      existingSolarRecord?.solar_generation_kVAh?.toString() || "",
    solar_generation_kVA:
      existingSolarRecord?.solar_generation_kVA?.toString() || "",

    documents: [],
    existingDocuments: existingSolarRecord?.documents || [],
  };
}

export function buildSolarGenerationForms(
  utilityBillingRecords: UtilityBillingRecord[],
  solarGenerationRecords: SolarGenerationRecord[],
): SolarGenerationFormState[] {
  const solarMap = new Map<string, SolarGenerationRecord>();

  for (const solarRecord of solarGenerationRecords) {
    solarMap.set(buildMatchKey(solarRecord), solarRecord);
  }

  return [...utilityBillingRecords]
    .sort(
      (a, b) =>
        new Date(b.billing_period_start).getTime() -
        new Date(a.billing_period_start).getTime(),
    )
    .map((billingRecord) => {
      const matchedSolarRecord = solarMap.get(buildMatchKey(billingRecord));
      return billingRecordToForm(billingRecord, matchedSolarRecord);
    });
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  return String(value);
}

export function buildSolarGenerationPayload(
  form: SolarGenerationFormState,
  facilityId: string,
  utilityAccountId: string,
  solarPlantId: string,
) {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    solar_plant_id: solarPlantId,

    billing_period_start: form.billing_period_start,
    billing_period_end: form.billing_period_end,
    billing_days: form.billing_days || undefined,
    bill_no: form.bill_no || undefined,

    import_kWh: form.import_kWh || undefined,
    import_kVAh: form.import_kVAh || undefined,
    import_kVA: form.import_kVA || undefined,

    export_kWh: form.export_kWh || undefined,
    export_kVAh: form.export_kVAh || undefined,
    export_kVA: form.export_kVA || undefined,

    net_kWh: form.net_kWh || undefined,
    net_kVAh: form.net_kVAh || undefined,
    net_kVA: form.net_kVA || undefined,

    solar_generation_kWh: form.solar_generation_kWh || undefined,
    solar_generation_kVAh: form.solar_generation_kVAh || undefined,
    solar_generation_kVA: form.solar_generation_kVA || undefined,
  };
}

export function updateSolarGenerationForm(
  form: SolarGenerationFormState,
  updater: (form: SolarGenerationFormState) => SolarGenerationFormState,
): SolarGenerationFormState {
  return recalculateSolarForm(updater(form));
}

export function filterSolarRecordsForPlant(
  records: SolarGenerationRecord[],
  solarPlantId: string,
): SolarGenerationRecord[] {
  return records.filter((record) => {
    const plantId =
      typeof record.solar_plant_id === "object" && record.solar_plant_id
        ? (record.solar_plant_id as { _id?: string })._id
        : record.solar_plant_id;
    return String(plantId) === String(solarPlantId);
  });
}

export function countAuditedPeriods(forms: SolarGenerationFormState[]) {
  const total = forms.length;
  const audited = forms.filter((form) => !form.isNew).length;
  return { audited, total };
}
