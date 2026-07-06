import * as XLSX from "xlsx";

export type UPSAuditExcelFormState = {
  ups_tag_asset_id: string;
  make_model: string;
  year_of_manufacture_installation: string;
  technology_type: string;
  input_phases: string;
  output_phases: string;
  rated_capacity_kVA: string;
  rated_output_power_kW: string;
  rated_input_voltage_LL: string;
  rated_input_current_A: string;
  rated_output_voltage_LL: string;
  rated_input_frequency_Hz: string;
  rated_output_power_factor: string;
  standard_compliance: string;
  bee_star_rating: string;

  input_voltage_R: string;
  input_voltage_Y: string;
  input_voltage_B: string;
  input_current_R: string;
  input_current_Y: string;
  input_current_B: string;
  input_active_power_kW: string;
  input_apparent_power_kVA: string;
  input_reactive_power_kVAR: string;
  input_power_factor: string;
  input_frequency_Hz: string;
  input_voltage_thd_R: string;
  input_voltage_thd_Y: string;
  input_voltage_thd_B: string;
  input_current_thd_R: string;
  input_current_thd_Y: string;
  input_current_thd_B: string;

  output_voltage_R: string;
  output_voltage_Y: string;
  output_voltage_B: string;
  output_current_R: string;
  output_current_Y: string;
  output_current_B: string;
  output_active_power_kW: string;
  output_apparent_power_kVA: string;
  output_power_factor: string;
  output_frequency_Hz: string;
  output_voltage_thd_R: string;
  output_voltage_thd_Y: string;
  output_voltage_thd_B: string;

  working_hours_per_day: string;
  working_days_per_year: string;
  load_factor: string;

  nameplate_efficiency_100_percent: string;
  nameplate_efficiency_75_percent: string;
  nameplate_efficiency_50_percent: string;
  nameplate_efficiency_25_percent: string;

  battery_type: string;
  battery_strings_count: string;
  battery_cells_per_string: string;
  rated_battery_bank_voltage_V: string;
  rated_ah_capacity: string;
  float_charge_voltage_V: string;
  float_charge_current_A: string;
  cell_voltage_min: string;
  cell_voltage_max: string;
  cell_voltage_mean: string;
  battery_internal_resistance_mOhm: string;
  battery_temp_ambient: string;
  battery_temp_hottest_cell: string;
  actual_backup_time_min: string;
  rated_backup_time_full_load_min: string;
  battery_age_years: string;
  battery_health_assessment: string;

  ups_room_temp_C: string;
  ups_room_humidity_percent: string;
  ups_surface_temp_front_C: string;
  ups_surface_temp_rear_C: string;
  hotspot_temperature_C: string;
  hotspot_location: string;
  cooling_fan_status: string;
  operational_mode: string;
  transfer_time_ms: string;
  operating_hours_total: string;
  last_preventive_maintenance_date: string;
  snmp_card_installed: string;
  bypass_trips_12m: string;
  input_submeter_installed: string;

  remarks: string;
};

export const UPS_AUDIT_DETAIL_FIELDS: {
  key: keyof UPSAuditExcelFormState;
  label: string;
}[] = [
  { key: "ups_tag_asset_id", label: "UPS Tag / Asset ID" },
  { key: "make_model", label: "Make & Model" },
  { key: "year_of_manufacture_installation", label: "Year of Manufacture / Installation" },
  { key: "technology_type", label: "Technology Type" },
  { key: "input_phases", label: "Input Phases (1-Phase / 3-Phase)" },
  { key: "output_phases", label: "Output phase (1-Phase / 3-Phase)" },
  { key: "rated_capacity_kVA", label: "Rated Capacity (kVA)" },
  { key: "rated_output_power_kW", label: "Rated Output Power (kW)" },
  { key: "rated_input_voltage_LL", label: "Rated Input Voltage (L-L) (V)" },
  { key: "rated_input_current_A", label: "Rated Input Current (A)" },
  { key: "rated_output_voltage_LL", label: "Rated Output Voltage (L-L) (V)" },
  { key: "rated_input_frequency_Hz", label: "Rated Input Frequency (Hz)" },
  { key: "rated_output_power_factor", label: "Rated Output Power Factor" },
  { key: "standard_compliance", label: "IEC/IS Standard Compliance" },
  { key: "bee_star_rating", label: "BEE Star Rating" },

  { key: "input_voltage_R", label: "Input Voltage R (V)" },
  { key: "input_voltage_Y", label: "Input Voltage Y (V)" },
  { key: "input_voltage_B", label: "Input Voltage B (V)" },
  { key: "input_current_R", label: "Input Current R (A)" },
  { key: "input_current_Y", label: "Input Current Y (A)" },
  { key: "input_current_B", label: "Input Current B (A)" },
  { key: "input_active_power_kW", label: "Input Active Power (kW)" },
  { key: "input_apparent_power_kVA", label: "Input Apparent Power (kVA)" },
  { key: "input_reactive_power_kVAR", label: "Input Reactive Power (kVAR)" },
  { key: "input_power_factor", label: "Input Power Factor" },
  { key: "input_frequency_Hz", label: "Input Frequency (Hz)" },
  { key: "input_voltage_thd_R", label: "Input Voltage THD R (%)" },
  { key: "input_voltage_thd_Y", label: "Input Voltage THD Y (%)" },
  { key: "input_voltage_thd_B", label: "Input Voltage THD B (%)" },
  { key: "input_current_thd_R", label: "Input Current THD R (%)" },
  { key: "input_current_thd_Y", label: "Input Current THD Y (%)" },
  { key: "input_current_thd_B", label: "Input Current THD B (%)" },

  { key: "output_voltage_R", label: "Output Voltage R (V)" },
  { key: "output_voltage_Y", label: "Output Voltage Y (V)" },
  { key: "output_voltage_B", label: "Output Voltage B (V)" },
  { key: "output_current_R", label: "Output Current R (A)" },
  { key: "output_current_Y", label: "Output Current Y (A)" },
  { key: "output_current_B", label: "Output Current B (A)" },
  { key: "output_active_power_kW", label: "Output Active Power (kW)" },
  { key: "output_apparent_power_kVA", label: "Output Apparent Power (kVA)" },
  { key: "output_power_factor", label: "Output Power Factor" },
  { key: "output_frequency_Hz", label: "Output Frequency (Hz)" },
  { key: "output_voltage_thd_R", label: "Output Voltage THD R (%)" },
  { key: "output_voltage_thd_Y", label: "Output Voltage THD Y (%)" },
  { key: "output_voltage_thd_B", label: "Output Voltage THD B (%)" },

  { key: "working_hours_per_day", label: "Working Hours / Day" },
  { key: "working_days_per_year", label: "Working Days / Year" },
  { key: "load_factor", label: "Load Factor (0 to 1)" },

  { key: "nameplate_efficiency_100_percent", label: "Nameplate Efficiency @ 100% Load (%)" },
  { key: "nameplate_efficiency_75_percent", label: "Nameplate Efficiency @ 75% Load (%)" },
  { key: "nameplate_efficiency_50_percent", label: "Nameplate Efficiency @ 50% Load (%)" },
  { key: "nameplate_efficiency_25_percent", label: "Nameplate Efficiency @ 25% Load (%)" },

  { key: "battery_type", label: "Battery Type" },
  { key: "battery_strings_count", label: "No. of Strings" },
  { key: "battery_cells_per_string", label: "Cells per String" },
  { key: "rated_battery_bank_voltage_V", label: "Rated Battery Bank Voltage (V)" },
  { key: "rated_ah_capacity", label: "Rated AH Capacity" },
  { key: "float_charge_voltage_V", label: "Float Charge Voltage (V)" },
  { key: "float_charge_current_A", label: "Float Charge Current (A)" },
  { key: "cell_voltage_min", label: "Cell Voltage Min (V)" },
  { key: "cell_voltage_max", label: "Cell Voltage Max (V)" },
  { key: "cell_voltage_mean", label: "Cell Voltage Mean (V)" },
  { key: "battery_internal_resistance_mOhm", label: "Battery Internal Resistance (mOhm)" },
  { key: "battery_temp_ambient", label: "Battery Ambient Temp (C)" },
  { key: "battery_temp_hottest_cell", label: "Battery Hottest Cell Temp (C)" },
  { key: "actual_backup_time_min", label: "Actual Backup Time (min)" },
  { key: "rated_backup_time_full_load_min", label: "Rated Backup Time (min)" },
  { key: "battery_age_years", label: "Battery Age (Years)" },
  { key: "battery_health_assessment", label: "Battery Health Assessment" },

  { key: "ups_room_temp_C", label: "UPS Room Temp (C)" },
  { key: "ups_room_humidity_percent", label: "UPS Room Humidity (%)" },
  { key: "ups_surface_temp_front_C", label: "UPS Surface Temp Front (C)" },
  { key: "ups_surface_temp_rear_C", label: "UPS Surface Temp Rear (C)" },
  { key: "hotspot_temperature_C", label: "Hotspot Temperature (C)" },
  { key: "hotspot_location", label: "Hotspot Location" },
  { key: "cooling_fan_status", label: "Cooling Fan Status" },
  { key: "operational_mode", label: "Operational Mode" },
  { key: "transfer_time_ms", label: "Transfer Time (ms)" },
  { key: "operating_hours_total", label: "Total Operating Hours (hrs)" },
  { key: "last_preventive_maintenance_date", label: "Last Preventive Maintenance Date" },
  { key: "snmp_card_installed", label: "SNMP Card Installed (Yes/No)" },
  { key: "bypass_trips_12m", label: "Bypass Trips (Last 12M)" },
  { key: "input_submeter_installed", label: "Input Sub-meter Installed (Yes/No)" },

  { key: "remarks", label: "Remarks" },
];

export const UPS_AUDIT_CALC_FIELDS: any[] = [];

export const UPS_AUDIT_ALL_EXCEL_KEYS: (keyof UPSAuditExcelFormState)[] =
  Array.from(
    new Set<keyof UPSAuditExcelFormState>([
      ...UPS_AUDIT_DETAIL_FIELDS.map((x) => x.key),
    ]),
  );

const SHEET_DETAILS = "UPS_details";
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
  const labelToKey = new Map<string, keyof UPSAuditExcelFormState>();
  const keySet = new Set<string>();
  for (const { key, label } of [
    ...UPS_AUDIT_DETAIL_FIELDS,
    ...UPS_AUDIT_CALC_FIELDS,
  ]) {
    keySet.add(key);
    labelToKey.set(normalizeKey(label), key);
    labelToKey.set(normalizeKey(key.replace(/_/g, " ")), key);
  }
  return { labelToKey, keySet };
}

const { labelToKey, keySet } = buildLookups();

function buildFieldValueSheet(
  fields: { key: keyof UPSAuditExcelFormState; label: string }[],
  getValue: (key: keyof UPSAuditExcelFormState) => string,
): (string | number)[][] {
  const rows: (string | number)[][] = [["Field", "Value"]];
  for (const { key, label } of fields) {
    rows.push([label, getValue(key)]);
  }
  return rows;
}

export function upsAuditFormToExcelPrefill(
  form: Record<string, unknown>,
): Partial<Record<keyof UPSAuditExcelFormState, string>> {
  const out: Partial<Record<keyof UPSAuditExcelFormState, string>> = {};
  for (const k of UPS_AUDIT_ALL_EXCEL_KEYS) {
    const v = form[k as string];
    out[k] = v !== undefined && v !== null ? String(v) : "";
  }
  return out;
}

export function downloadUPSAuditExcelTemplate(
  form: Partial<Record<keyof UPSAuditExcelFormState, string>>,
  filename = "ups-system-energy-audit-template.xlsx",
) {
  const val = (k: keyof UPSAuditExcelFormState) => String(form[k] ?? "");
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(
      buildFieldValueSheet(UPS_AUDIT_DETAIL_FIELDS, val),
    ),
    SHEET_DETAILS,
  );

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(buildFieldValueSheet(UPS_AUDIT_CALC_FIELDS, val)),
    SHEET_CALC,
  );

  XLSX.writeFile(wb, filename);
}

function parseFieldValueSheet(
  matrix: unknown[][],
): Partial<Record<keyof UPSAuditExcelFormState, string>> {
  const out: Partial<Record<keyof UPSAuditExcelFormState, string>> = {};
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

    let key: keyof UPSAuditExcelFormState | undefined;
    if (keySet.has(fieldRaw)) {
      key = fieldRaw as keyof UPSAuditExcelFormState;
    } else {
      key = labelToKey.get(normalizeKey(fieldRaw));
    }
    if (key) out[key] = valueRaw;
  }
  return out;
}

export function parseUPSAuditExcel(
  file: File,
): Promise<Partial<Record<keyof UPSAuditExcelFormState, string>>> {
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
        const merged: Partial<Record<keyof UPSAuditExcelFormState, string>> =
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
