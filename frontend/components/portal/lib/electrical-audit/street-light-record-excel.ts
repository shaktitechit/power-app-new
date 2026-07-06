import * as XLSX from "xlsx";

export type StreetLightAuditExcelFormState = {
  area_location: string;
  fixture_type: string;
  lamp_type: string;
  wattage_W: string;
  quantity_nos: string;
  control_type: string;
  working_hours_per_day: string;
  working_days_per_year: string;
  remarks: string;

  connected_load_kW: string;
  annual_energy_kWh: string;
};

export const STREET_LIGHT_AUDIT_DETAIL_FIELDS: {
  key: keyof StreetLightAuditExcelFormState;
  label: string;
}[] = [
  { key: "area_location", label: "Area / Location" },
  { key: "fixture_type", label: "Fixture Type" },
  { key: "lamp_type", label: "Lamp Type" },
  { key: "wattage_W", label: "Wattage (W)" },
  { key: "quantity_nos", label: "Quantity (Nos)" },
  {
    key: "control_type",
    label: "Control Type (manual / timer / sensor / other)",
  },
  { key: "working_hours_per_day", label: "Working Hours / Day" },
  { key: "working_days_per_year", label: "Working Days / Year" },
  { key: "remarks", label: "Remarks" },
];

export const STREET_LIGHT_AUDIT_CALC_FIELDS: {
  key: keyof StreetLightAuditExcelFormState;
  label: string;
}[] = [];

export const STREET_LIGHT_AUDIT_ALL_EXCEL_KEYS: (keyof StreetLightAuditExcelFormState)[] =
  Array.from(
    new Set<keyof StreetLightAuditExcelFormState>([
      ...STREET_LIGHT_AUDIT_DETAIL_FIELDS.map((x) => x.key),
    ]),
  );

const SHEET_DETAILS = "StreetLight_details";
const SHEET_CALC = "Calculations";

function getMatrix(sheet: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<
    (string | number | Date | null | undefined)[]
  >(sheet, { header: 1, defval: "", raw: false }) as unknown[][];
}

function cellToString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return "";
    return String(value);
  }
  return String(value).trim();
}

function normalizeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildLookups() {
  const labelToKey = new Map<string, keyof StreetLightAuditExcelFormState>();
  const keySet = new Set<string>();
  for (const { key, label } of [
    ...STREET_LIGHT_AUDIT_DETAIL_FIELDS,
    ...STREET_LIGHT_AUDIT_CALC_FIELDS,
  ]) {
    keySet.add(key);
    labelToKey.set(normalizeKey(label), key);
    labelToKey.set(normalizeKey(key.replace(/_/g, " ")), key);
  }
  return { labelToKey, keySet };
}

const { labelToKey, keySet } = buildLookups();

function buildFieldValueSheet(
  fields: { key: keyof StreetLightAuditExcelFormState; label: string }[],
  getValue: (key: keyof StreetLightAuditExcelFormState) => string,
): (string | number)[][] {
  const rows: (string | number)[][] = [["Field", "Value"]];
  for (const { key, label } of fields) {
    rows.push([label, getValue(key)]);
  }
  return rows;
}

export function streetLightAuditFormToExcelPrefill(
  form: Record<string, unknown>,
): Partial<Record<keyof StreetLightAuditExcelFormState, string>> {
  const out: Partial<Record<keyof StreetLightAuditExcelFormState, string>> = {};
  for (const k of STREET_LIGHT_AUDIT_ALL_EXCEL_KEYS) {
    const v = form[k as string];
    out[k] = v !== undefined && v !== null ? String(v) : "";
  }
  return out;
}

export function downloadStreetLightAuditExcelTemplate(
  form: Partial<Record<keyof StreetLightAuditExcelFormState, string>>,
  filename = "street-light-audit-template.xlsx",
) {
  const val = (k: keyof StreetLightAuditExcelFormState) => String(form[k] ?? "");
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      buildFieldValueSheet(STREET_LIGHT_AUDIT_DETAIL_FIELDS, val),
    ),
    SHEET_DETAILS,
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(buildFieldValueSheet(STREET_LIGHT_AUDIT_CALC_FIELDS, val)),
    SHEET_CALC,
  );

  XLSX.writeFile(wb, filename);
}

function parseFieldValueSheet(
  matrix: unknown[][],
): Partial<Record<keyof StreetLightAuditExcelFormState, string>> {
  const out: Partial<Record<keyof StreetLightAuditExcelFormState, string>> = {};
  let startRow = 0;
  if (matrix.length > 0) {
    const r0 = matrix[0];
    const a0 = cellToString(r0?.[0]).toLowerCase();
    const b0 = cellToString(r0?.[1]).toLowerCase();
    if (a0 === "field" && b0 === "value") startRow = 1;
  }

  for (let i = startRow; i < matrix.length; i += 1) {
    const row = matrix[i];
    if (!row || row.length < 2) continue;
    const fieldRaw = cellToString(row[0]);
    const valueRaw = cellToString(row[1]);
    if (!fieldRaw) continue;

    let key: keyof StreetLightAuditExcelFormState | undefined;
    if (keySet.has(fieldRaw)) {
      key = fieldRaw as keyof StreetLightAuditExcelFormState;
    } else {
      key = labelToKey.get(normalizeKey(fieldRaw));
    }
    if (key) out[key] = valueRaw;
  }
  return out;
}

export function parseStreetLightAuditExcel(
  file: File,
): Promise<Partial<Record<keyof StreetLightAuditExcelFormState, string>>> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data || !(data instanceof ArrayBuffer)) {
          reject(new Error("Could not read file."));
          return;
        }

        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const merged: Partial<Record<keyof StreetLightAuditExcelFormState, string>> =
          {};

        const read = (name: string) =>
          workbook.Sheets[name]
            ? parseFieldValueSheet(getMatrix(workbook.Sheets[name]))
            : {};

        Object.assign(merged, read(SHEET_DETAILS));
        Object.assign(merged, read(SHEET_CALC));

        resolve(merged);
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsArrayBuffer(file);
  });
}
