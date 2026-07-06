import type { UPSAuditRecord, CreateUPSAuditRequest } from "@/store/slices/electrical-audit/upsAuditApiSlice";

export type ExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  caption?: string;
  uploadedAt?: string;
};

export type UPSAuditFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  facility_id: string;
  utility_account_id: string;

  // 1. NAMEPLATE & IDENTIFICATION
  ups_tag_asset_id: string;
  make_model: string;
  year_of_manufacture_installation: string;
  technology_type: string;
  input_phases: "" | "1-Phase" | "3-Phase";
  output_phases: "" | "1-Phase" | "3-Phase";
  rated_capacity_kVA: string;
  rated_output_power_kW: string;
  rated_input_voltage_LL: string;
  rated_input_current_A: string;
  rated_output_voltage_LL: string;
  rated_input_frequency_Hz: string;
  rated_output_power_factor: string;
  standard_compliance: string;
  bee_star_rating: string;

  // 2. ELECTRICAL MEASUREMENTS — INPUT SIDE
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

  // 3. ELECTRICAL MEASUREMENTS — OUTPUT SIDE
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

  // 4. LOADING & ENERGY CONSUMPTION
  loading_kVA_percent: string;
  loading_kW_percent: string;
  working_hours_per_day: string;
  working_days_per_year: string;
  load_factor: string;
  annual_input_energy_kWh: string;
  annual_output_energy_kWh: string;
  annual_energy_loss_kWh: string;
  annual_co2_emission_t: string;

  // 5. EFFICIENCY BENCHMARKING
  measured_efficiency_percent: string;
  nameplate_efficiency_100_percent: string;
  nameplate_efficiency_75_percent: string;
  nameplate_efficiency_50_percent: string;
  nameplate_efficiency_25_percent: string;
  efficiency_deviation_percentage_points: string;
  measured_losses_kW: string;

  // 6. BATTERY SYSTEM
  battery_type: string;
  battery_strings_count: string;
  battery_cells_per_string: string;
  rated_battery_bank_voltage_V: string;
  rated_ah_capacity: string;
  float_charge_voltage_V: string;
  float_charge_current_A: string;
  float_charge_power_W: string;
  cell_voltage_min: string;
  cell_voltage_max: string;
  cell_voltage_mean: string;
  cell_voltage_imbalance_V: string;
  battery_internal_resistance_mOhm: string;
  battery_temp_ambient: string;
  battery_temp_hottest_cell: string;
  actual_backup_time_min: string;
  rated_backup_time_full_load_min: string;
  battery_age_years: string;
  battery_health_assessment: string;

  // 7. THERMAL & OPERATIONAL DATA
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
  snmp_card_installed: boolean;
  bypass_trips_12m: string;
  input_submeter_installed: boolean;

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

export const computeUPSValues = (form: UPSAuditFormState) => {
  const inputkW = Number(form.input_active_power_kW);
  const outputkW = Number(form.output_active_power_kW);
  const outputkVA = Number(form.output_apparent_power_kVA);
  const capacitykVA = Number(form.rated_capacity_kVA);
  const capacitykW = Number(form.rated_output_power_kW);
  const hours = Number(form.working_hours_per_day);
  const days = Number(form.working_days_per_year);
  const loadFactor = Number(form.load_factor);
  const nameplateEff100 = Number(form.nameplate_efficiency_100_percent);

  let measuredEff = "";
  let loadingkVA = "";
  let loadingkW = "";
  let annualInput = "";
  let annualOutput = "";
  let annualLoss = "";
  let co2 = "";
  let dev = "";
  let measuredLossVal = "";
  let floatPower = "";
  let balance = "";

  if (!Number.isNaN(inputkW) && !Number.isNaN(outputkW) && inputkW > 0) {
    measuredEff = ((outputkW / inputkW) * 100).toFixed(2);
  }
  if (!Number.isNaN(outputkVA) && !Number.isNaN(capacitykVA) && capacitykVA > 0) {
    loadingkVA = ((outputkVA / capacitykVA) * 100).toFixed(2);
  }
  if (!Number.isNaN(outputkW) && !Number.isNaN(capacitykW) && capacitykW > 0) {
    loadingkW = ((outputkW / capacitykW) * 100).toFixed(2);
  }

  const factor = !Number.isNaN(loadFactor) ? loadFactor : 1.0;
  if (!Number.isNaN(inputkW) && !Number.isNaN(hours) && !Number.isNaN(days)) {
    annualInput = (inputkW * hours * days * factor).toFixed(2);
  }
  if (!Number.isNaN(outputkW) && !Number.isNaN(hours) && !Number.isNaN(days)) {
    annualOutput = (outputkW * hours * days * factor).toFixed(2);
  }
  if (annualInput && annualOutput) {
    annualLoss = (Number(annualInput) - Number(annualOutput)).toFixed(2);
  }
  if (annualInput) {
    co2 = ((Number(annualInput) * 0.82) / 1000).toFixed(2);
  }
  if (measuredEff && !Number.isNaN(nameplateEff100)) {
    dev = (Number(measuredEff) - nameplateEff100).toFixed(2);
  }
  if (!Number.isNaN(inputkW) && !Number.isNaN(outputkW)) {
    measuredLossVal = (inputkW - outputkW).toFixed(2);
  }

  const vFloat = Number(form.float_charge_voltage_V);
  const iFloat = Number(form.float_charge_current_A);
  if (!Number.isNaN(vFloat) && !Number.isNaN(iFloat)) {
    floatPower = (vFloat * iFloat).toFixed(2);
  }

  const vMax = Number(form.cell_voltage_max);
  const vMin = Number(form.cell_voltage_min);
  if (!Number.isNaN(vMax) && !Number.isNaN(vMin)) {
    balance = (vMax - vMin).toFixed(2);
  }

  return {
    ...form,
    measured_efficiency_percent: measuredEff,
    loading_kVA_percent: loadingkVA,
    loading_kW_percent: loadingkW,
    annual_input_energy_kWh: annualInput,
    annual_output_energy_kWh: annualOutput,
    annual_energy_loss_kWh: annualLoss,
    annual_co2_emission_t: co2,
    efficiency_deviation_percentage_points: dev,
    measured_losses_kW: measuredLossVal,
    float_charge_power_W: floatPower,
    cell_voltage_imbalance_V: balance,
  };
};

export const createEmptyForm = (
  facilityId: string,
  utilityAccountId: string,
): UPSAuditFormState =>
  computeUPSValues({
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isNew: true,
  
    facility_id: facilityId,
    utility_account_id: utilityAccountId,

    ups_tag_asset_id: "",
    make_model: "",
    year_of_manufacture_installation: "",
    technology_type: "",
    input_phases: "",
    output_phases: "",
    rated_capacity_kVA: "",
    rated_output_power_kW: "",
    rated_input_voltage_LL: "",
    rated_input_current_A: "",
    rated_output_voltage_LL: "",
    rated_input_frequency_Hz: "",
    rated_output_power_factor: "",
    standard_compliance: "",
    bee_star_rating: "",

    input_voltage_R: "",
    input_voltage_Y: "",
    input_voltage_B: "",
    input_current_R: "",
    input_current_Y: "",
    input_current_B: "",
    input_active_power_kW: "",
    input_apparent_power_kVA: "",
    input_reactive_power_kVAR: "",
    input_power_factor: "",
    input_frequency_Hz: "",
    input_voltage_thd_R: "",
    input_voltage_thd_Y: "",
    input_voltage_thd_B: "",
    input_current_thd_R: "",
    input_current_thd_Y: "",
    input_current_thd_B: "",

    output_voltage_R: "",
    output_voltage_Y: "",
    output_voltage_B: "",
    output_current_R: "",
    output_current_Y: "",
    output_current_B: "",
    output_active_power_kW: "",
    output_apparent_power_kVA: "",
    output_power_factor: "",
    output_frequency_Hz: "",
    output_voltage_thd_R: "",
    output_voltage_thd_Y: "",
    output_voltage_thd_B: "",

    loading_kVA_percent: "",
    loading_kW_percent: "",
    working_hours_per_day: "24",
    working_days_per_year: "365",
    load_factor: "",
    annual_input_energy_kWh: "",
    annual_output_energy_kWh: "",
    annual_energy_loss_kWh: "",
    annual_co2_emission_t: "",

    measured_efficiency_percent: "",
    nameplate_efficiency_100_percent: "",
    nameplate_efficiency_75_percent: "",
    nameplate_efficiency_50_percent: "",
    nameplate_efficiency_25_percent: "",
    efficiency_deviation_percentage_points: "",
    measured_losses_kW: "",

    battery_type: "",
    battery_strings_count: "",
    battery_cells_per_string: "",
    rated_battery_bank_voltage_V: "",
    rated_ah_capacity: "",
    float_charge_voltage_V: "",
    float_charge_current_A: "",
    float_charge_power_W: "",
    cell_voltage_min: "",
    cell_voltage_max: "",
    cell_voltage_mean: "",
    cell_voltage_imbalance_V: "",
    battery_internal_resistance_mOhm: "",
    battery_temp_ambient: "",
    battery_temp_hottest_cell: "",
    actual_backup_time_min: "",
    rated_backup_time_full_load_min: "",
    battery_age_years: "",
    battery_health_assessment: "",

    ups_room_temp_C: "",
    ups_room_humidity_percent: "",
    ups_surface_temp_front_C: "",
    ups_surface_temp_rear_C: "",
    hotspot_temperature_C: "",
    hotspot_location: "",
    cooling_fan_status: "",
    operational_mode: "",
    transfer_time_ms: "",
    operating_hours_total: "",
    last_preventive_maintenance_date: "",
    snmp_card_installed: false,
    bypass_trips_12m: "",
    input_submeter_installed: false,

    remarks: "",

    existingDocuments: [],
    newDocuments: [],
  });

export const auditToForm = (record: UPSAuditRecord): UPSAuditFormState => {
  const facilityRef = record.facility_id as string | { _id?: string };
  const utilityRef = record.utility_account_id as string | { _id?: string };

  return computeUPSValues({
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

    ups_tag_asset_id: record.ups_tag_asset_id || "",
    make_model: record.make_model || "",
    year_of_manufacture_installation: record.year_of_manufacture_installation || "",
    technology_type: record.technology_type || "",
    input_phases: record.input_phases || "",
    output_phases: record.output_phases || "",
    rated_capacity_kVA: toStringValue(record.rated_capacity_kVA),
    rated_output_power_kW: toStringValue(record.rated_output_power_kW),
    rated_input_voltage_LL: toStringValue(record.rated_input_voltage_LL),
    rated_input_current_A: toStringValue(record.rated_input_current_A),
    rated_output_voltage_LL: toStringValue(record.rated_output_voltage_LL),
    rated_input_frequency_Hz: toStringValue(record.rated_input_frequency_Hz),
    rated_output_power_factor: toStringValue(record.rated_output_power_factor),
    standard_compliance: record.standard_compliance || "",
    bee_star_rating: toStringValue(record.bee_star_rating),

    input_voltage_R: toStringValue(record.input_voltage_R),
    input_voltage_Y: toStringValue(record.input_voltage_Y),
    input_voltage_B: toStringValue(record.input_voltage_B),
    input_current_R: toStringValue(record.input_current_R),
    input_current_Y: toStringValue(record.input_current_Y),
    input_current_B: toStringValue(record.input_current_B),
    input_active_power_kW: toStringValue(record.input_active_power_kW),
    input_apparent_power_kVA: toStringValue(record.input_apparent_power_kVA),
    input_reactive_power_kVAR: toStringValue(record.input_reactive_power_kVAR),
    input_power_factor: toStringValue(record.input_power_factor),
    input_frequency_Hz: toStringValue(record.input_frequency_Hz),
    input_voltage_thd_R: toStringValue(record.input_voltage_thd_R),
    input_voltage_thd_Y: toStringValue(record.input_voltage_thd_Y),
    input_voltage_thd_B: toStringValue(record.input_voltage_thd_B),
    input_current_thd_R: toStringValue(record.input_current_thd_R),
    input_current_thd_Y: toStringValue(record.input_current_thd_Y),
    input_current_thd_B: toStringValue(record.input_current_thd_B),

    output_voltage_R: toStringValue(record.output_voltage_R),
    output_voltage_Y: toStringValue(record.output_voltage_Y),
    output_voltage_B: toStringValue(record.output_voltage_B),
    output_current_R: toStringValue(record.output_current_R),
    output_current_Y: toStringValue(record.output_current_Y),
    output_current_B: toStringValue(record.output_current_B),
    output_active_power_kW: toStringValue(record.output_active_power_kW),
    output_apparent_power_kVA: toStringValue(record.output_apparent_power_kVA),
    output_power_factor: toStringValue(record.output_power_factor),
    output_frequency_Hz: toStringValue(record.output_frequency_Hz),
    output_voltage_thd_R: toStringValue(record.output_voltage_thd_R),
    output_voltage_thd_Y: toStringValue(record.output_voltage_thd_Y),
    output_voltage_thd_B: toStringValue(record.output_voltage_thd_B),

    loading_kVA_percent: toStringValue(record.loading_kVA_percent),
    loading_kW_percent: toStringValue(record.loading_kW_percent),
    working_hours_per_day: toStringValue(record.working_hours_per_day),
    working_days_per_year: toStringValue(record.working_days_per_year),
    load_factor: toStringValue(record.load_factor),
    annual_input_energy_kWh: toStringValue(record.annual_input_energy_kWh),
    annual_output_energy_kWh: toStringValue(record.annual_output_energy_kWh),
    annual_energy_loss_kWh: toStringValue(record.annual_energy_loss_kWh),
    annual_co2_emission_t: toStringValue(record.annual_co2_emission_t),

    measured_efficiency_percent: toStringValue(record.measured_efficiency_percent),
    nameplate_efficiency_100_percent: toStringValue(record.nameplate_efficiency_100_percent),
    nameplate_efficiency_75_percent: toStringValue(record.nameplate_efficiency_75_percent),
    nameplate_efficiency_50_percent: toStringValue(record.nameplate_efficiency_50_percent),
    nameplate_efficiency_25_percent: toStringValue(record.nameplate_efficiency_25_percent),
    efficiency_deviation_percentage_points: toStringValue(record.efficiency_deviation_percentage_points),
    measured_losses_kW: toStringValue(record.measured_losses_kW),

    battery_type: record.battery_type || "",
    battery_strings_count: toStringValue(record.battery_strings_count),
    battery_cells_per_string: toStringValue(record.battery_cells_per_string),
    rated_battery_bank_voltage_V: toStringValue(record.rated_battery_bank_voltage_V),
    rated_ah_capacity: toStringValue(record.rated_ah_capacity),
    float_charge_voltage_V: toStringValue(record.float_charge_voltage_V),
    float_charge_current_A: toStringValue(record.float_charge_current_A),
    float_charge_power_W: toStringValue(record.float_charge_power_W),
    cell_voltage_min: toStringValue(record.cell_voltage_min),
    cell_voltage_max: toStringValue(record.cell_voltage_max),
    cell_voltage_mean: toStringValue(record.cell_voltage_mean),
    cell_voltage_imbalance_V: toStringValue(record.cell_voltage_imbalance_V),
    battery_internal_resistance_mOhm: toStringValue(record.battery_internal_resistance_mOhm),
    battery_temp_ambient: toStringValue(record.battery_temp_ambient),
    battery_temp_hottest_cell: toStringValue(record.battery_temp_hottest_cell),
    actual_backup_time_min: toStringValue(record.actual_backup_time_min),
    rated_backup_time_full_load_min: toStringValue(record.rated_backup_time_full_load_min),
    battery_age_years: record.battery_age_years || "",
    battery_health_assessment: record.battery_health_assessment || "",

    ups_room_temp_C: toStringValue(record.ups_room_temp_C),
    ups_room_humidity_percent: toStringValue(record.ups_room_humidity_percent),
    ups_surface_temp_front_C: toStringValue(record.ups_surface_temp_front_C),
    ups_surface_temp_rear_C: toStringValue(record.ups_surface_temp_rear_C),
    hotspot_temperature_C: toStringValue(record.hotspot_temperature_C),
    hotspot_location: record.hotspot_location || "",
    cooling_fan_status: record.cooling_fan_status || "",
    operational_mode: record.operational_mode || "",
    transfer_time_ms: toStringValue(record.transfer_time_ms),
    operating_hours_total: toStringValue(record.operating_hours_total),
    last_preventive_maintenance_date: record.last_preventive_maintenance_date || "",
    snmp_card_installed: Boolean(record.snmp_card_installed),
    bypass_trips_12m: toStringValue(record.bypass_trips_12m),
    input_submeter_installed: Boolean(record.input_submeter_installed),

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

export function buildUPSAuditPayload(
  form: UPSAuditFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateUPSAuditRequest {
  const payload: any = {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    ups_tag_asset_id: form.ups_tag_asset_id || undefined,
    make_model: form.make_model || undefined,
    year_of_manufacture_installation: form.year_of_manufacture_installation || undefined,
    technology_type: form.technology_type || undefined,
    input_phases: form.input_phases || undefined,
    output_phases: form.output_phases || undefined,
    rated_capacity_kVA: toNumber(form.rated_capacity_kVA),
    rated_output_power_kW: toNumber(form.rated_output_power_kW),
    rated_input_voltage_LL: toNumber(form.rated_input_voltage_LL),
    rated_input_current_A: toNumber(form.rated_input_current_A),
    rated_output_voltage_LL: toNumber(form.rated_output_voltage_LL),
    rated_input_frequency_Hz: toNumber(form.rated_input_frequency_Hz),
    rated_output_power_factor: toNumber(form.rated_output_power_factor),
    standard_compliance: form.standard_compliance || undefined,
    bee_star_rating: toNumber(form.bee_star_rating),

    input_voltage_R: toNumber(form.input_voltage_R),
    input_voltage_Y: toNumber(form.input_voltage_Y),
    input_voltage_B: toNumber(form.input_voltage_B),
    input_current_R: toNumber(form.input_current_R),
    input_current_Y: toNumber(form.input_current_Y),
    input_current_B: toNumber(form.input_current_B),
    input_active_power_kW: toNumber(form.input_active_power_kW),
    input_apparent_power_kVA: toNumber(form.input_apparent_power_kVA),
    input_reactive_power_kVAR: toNumber(form.input_reactive_power_kVAR),
    input_power_factor: toNumber(form.input_power_factor),
    input_frequency_Hz: toNumber(form.input_frequency_Hz),
    input_voltage_thd_R: toNumber(form.input_voltage_thd_R),
    input_voltage_thd_Y: toNumber(form.input_voltage_thd_Y),
    input_voltage_thd_B: toNumber(form.input_voltage_thd_B),
    input_current_thd_R: toNumber(form.input_current_thd_R),
    input_current_thd_Y: toNumber(form.input_current_thd_Y),
    input_current_thd_B: toNumber(form.input_current_thd_B),

    output_voltage_R: toNumber(form.output_voltage_R),
    output_voltage_Y: toNumber(form.output_voltage_Y),
    output_voltage_B: toNumber(form.output_voltage_B),
    output_current_R: toNumber(form.output_current_R),
    output_current_Y: toNumber(form.output_current_Y),
    output_current_B: toNumber(form.output_current_B),
    output_active_power_kW: toNumber(form.output_active_power_kW),
    output_apparent_power_kVA: toNumber(form.output_apparent_power_kVA),
    output_power_factor: toNumber(form.output_power_factor),
    output_frequency_Hz: toNumber(form.output_frequency_Hz),
    output_voltage_thd_R: toNumber(form.output_voltage_thd_R),
    output_voltage_thd_Y: toNumber(form.output_voltage_thd_Y),
    output_voltage_thd_B: toNumber(form.output_voltage_thd_B),

    loading_kVA_percent: toNumber(form.loading_kVA_percent),
    loading_kW_percent: toNumber(form.loading_kW_percent),
    working_hours_per_day: toNumber(form.working_hours_per_day),
    working_days_per_year: toNumber(form.working_days_per_year),
    load_factor: toNumber(form.load_factor),
    annual_input_energy_kWh: toNumber(form.annual_input_energy_kWh),
    annual_output_energy_kWh: toNumber(form.annual_output_energy_kWh),
    annual_energy_loss_kWh: toNumber(form.annual_energy_loss_kWh),
    annual_co2_emission_t: toNumber(form.annual_co2_emission_t),

    measured_efficiency_percent: toNumber(form.measured_efficiency_percent),
    nameplate_efficiency_100_percent: toNumber(form.nameplate_efficiency_100_percent),
    nameplate_efficiency_75_percent: toNumber(form.nameplate_efficiency_75_percent),
    nameplate_efficiency_50_percent: toNumber(form.nameplate_efficiency_50_percent),
    nameplate_efficiency_25_percent: toNumber(form.nameplate_efficiency_25_percent),
    efficiency_deviation_percentage_points: toNumber(form.efficiency_deviation_percentage_points),
    measured_losses_kW: toNumber(form.measured_losses_kW),

    battery_type: form.battery_type || undefined,
    battery_strings_count: toNumber(form.battery_strings_count),
    battery_cells_per_string: toNumber(form.battery_cells_per_string),
    rated_battery_bank_voltage_V: toNumber(form.rated_battery_bank_voltage_V),
    rated_ah_capacity: toNumber(form.rated_ah_capacity),
    float_charge_voltage_V: toNumber(form.float_charge_voltage_V),
    float_charge_current_A: toNumber(form.float_charge_current_A),
    float_charge_power_W: toNumber(form.float_charge_power_W),
    cell_voltage_min: toNumber(form.cell_voltage_min),
    cell_voltage_max: toNumber(form.cell_voltage_max),
    cell_voltage_mean: toNumber(form.cell_voltage_mean),
    cell_voltage_imbalance_V: toNumber(form.cell_voltage_imbalance_V),
    battery_internal_resistance_mOhm: toNumber(form.battery_internal_resistance_mOhm),
    battery_temp_ambient: toNumber(form.battery_temp_ambient),
    battery_temp_hottest_cell: toNumber(form.battery_temp_hottest_cell),
    actual_backup_time_min: toNumber(form.actual_backup_time_min),
    rated_backup_time_full_load_min: toNumber(form.rated_backup_time_full_load_min),
    battery_age_years: form.battery_age_years || undefined,
    battery_health_assessment: form.battery_health_assessment || undefined,

    ups_room_temp_C: toNumber(form.ups_room_temp_C),
    ups_room_humidity_percent: toNumber(form.ups_room_humidity_percent),
    ups_surface_temp_front_C: toNumber(form.ups_surface_temp_front_C),
    ups_surface_temp_rear_C: toNumber(form.ups_surface_temp_rear_C),
    hotspot_temperature_C: toNumber(form.hotspot_temperature_C),
    hotspot_location: form.hotspot_location || undefined,
    cooling_fan_status: form.cooling_fan_status || undefined,
    operational_mode: form.operational_mode || undefined,
    transfer_time_ms: toNumber(form.transfer_time_ms),
    operating_hours_total: toNumber(form.operating_hours_total),
    last_preventive_maintenance_date: form.last_preventive_maintenance_date || undefined,
    snmp_card_installed: form.snmp_card_installed,
    bypass_trips_12m: toNumber(form.bypass_trips_12m),
    input_submeter_installed: form.input_submeter_installed,

    remarks: form.remarks || undefined,
  };
  return payload;
}

export function sortUPSAuditsStable(records: UPSAuditRecord[]): UPSAuditRecord[] {
  return [...records].sort((a, b) => {
    const ta = Date.parse(a.audit_date ?? a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.audit_date ?? b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getUPSAuditTabLabel(record: UPSAuditRecord, index: number) {
  const tag = record.ups_tag_asset_id?.trim();
  const make = record.make_model?.trim();
  const prefix = `UPS ${index + 1}`;
  if (tag) return `${prefix} (${tag})`;
  if (make) return `${prefix} (${make})`;
  return prefix;
}

export function updateUPSAuditForm(
  form: UPSAuditFormState,
  updater: (form: UPSAuditFormState) => UPSAuditFormState,
): UPSAuditFormState {
  return computeUPSValues(updater(form));
}

export function applyUPSAuditExcelParsed(
  form: UPSAuditFormState,
  parsed: Record<string, unknown>,
): UPSAuditFormState {
  const next = { ...form } as UPSAuditFormState;
  const mutable = next as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    if (k === "snmp_card_installed" || k === "input_submeter_installed") {
      mutable[k] = String(v).toLowerCase() === "true" || String(v).toLowerCase() === "yes";
    } else {
      mutable[k] = v;
    }
  }
  return computeUPSValues(next);
}
