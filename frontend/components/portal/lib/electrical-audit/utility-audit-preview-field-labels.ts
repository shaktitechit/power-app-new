import { DG_AUDIT_EXCEL_FIELDS } from "./dg-audit-record-excel";
import {
  AC_AUDIT_BASIC_FIELDS,
  AC_AUDIT_CALC_FIELDS,
  AC_AUDIT_MEASUREMENT_FIELDS,
} from "./ac-audit-record-excel";
import {
  FAN_AUDIT_CALC_FIELDS,
  FAN_AUDIT_DETAIL_FIELDS,
} from "./fan-audit-record-excel";
import {
  LIGHTING_AUDIT_CALC_FIELDS,
  LIGHTING_AUDIT_DETAIL_FIELDS,
} from "./lighting-audit-record-excel";
import {
  LUX_MEASUREMENT_CALC_FIELDS,
  LUX_MEASUREMENT_DETAIL_FIELDS,
} from "./lux-measurement-excel";
import {
  MISC_LOAD_AUDIT_CALC_FIELDS,
  MISC_LOAD_AUDIT_DETAIL_FIELDS,
} from "./misc-load-audit-excel";
import { PUMP_AUDIT_EXCEL_FIELDS } from "./pump-audit-record-excel";
import { TRANSFORMER_AUDIT_EXCEL_FIELDS } from "./transformer-audit-record-excel";
import { UTILITY_BILLING_RECORD_EXCEL_FIELDS } from "./utility-billing-record-excel";
import { UTILITY_TARIFF_EXCEL_FIELDS } from "./utility-tariff-excel";
import { humanizeNestedKey } from "@/components/portal/lib/audit-snapshot-table-utils";

const fieldsToMap = (fields: { key: string; label: string }[]) =>
  Object.fromEntries(fields.map((field) => [field.key, field.label]));

/** User-facing column titles for preview sheets (leaf keys and common paths). */
export const PREVIEW_FIELD_LABELS: Record<string, string> = {
  ...fieldsToMap(UTILITY_TARIFF_EXCEL_FIELDS),
  ...fieldsToMap(UTILITY_BILLING_RECORD_EXCEL_FIELDS),
  ...fieldsToMap(DG_AUDIT_EXCEL_FIELDS),
  ...fieldsToMap(TRANSFORMER_AUDIT_EXCEL_FIELDS),
  ...fieldsToMap(PUMP_AUDIT_EXCEL_FIELDS),
  ...fieldsToMap(AC_AUDIT_BASIC_FIELDS),
  ...fieldsToMap(AC_AUDIT_MEASUREMENT_FIELDS),
  ...fieldsToMap(AC_AUDIT_CALC_FIELDS),
  ...fieldsToMap(LIGHTING_AUDIT_DETAIL_FIELDS),
  ...fieldsToMap(LIGHTING_AUDIT_CALC_FIELDS),
  ...fieldsToMap(FAN_AUDIT_DETAIL_FIELDS),
  ...fieldsToMap(FAN_AUDIT_CALC_FIELDS),
  ...fieldsToMap(LUX_MEASUREMENT_DETAIL_FIELDS),
  ...fieldsToMap(LUX_MEASUREMENT_CALC_FIELDS),
  ...fieldsToMap(MISC_LOAD_AUDIT_DETAIL_FIELDS),
  ...fieldsToMap(MISC_LOAD_AUDIT_CALC_FIELDS),

  is_completed: "Status",
  audit_date: "Audit Date",
  status: "Record Status",

  name: "Name",
  panel_name: "Panel Name",
  ldb_name: "LDB Name",
  pit_name: "Pit Name",
  unit_name: "Unit Name",
  area_name: "Area Name",
  elevator_name: "Elevator Name",
  panel_type: "Panel Type",
  pit_type: "Pit Type",
  equipment_type: "Equipment Type",
  unit_type: "Unit Type",
  location: "Location",
  capacity_kva: "Capacity (kVA)",
  resistance_ohm: "Resistance (Ω)",
  test_date: "Test Date",
  due_date: "Due Date",
  inspection_date: "Inspection Date",
  inspected_by: "Inspected By",
  max_temperature_c: "Max Temperature (°C)",
  delta_temperature_c: "Delta Temperature (°C)",
  urgency: "Urgency",
  leakage_found: "Leakage Found",
  room_temperature_c: "Room Temperature (°C)",
  relative_humidity_percent: "Relative Humidity (%)",
  transformer_loading_percent: "Transformer Loading (%)",
  panel_breaker_loading_percent: "Panel Breaker Loading (%)",
  current_unbalance_percent: "Current Unbalance (%)",
  voltage_unbalance_percent: "Voltage Unbalance (%)",
  dg_set: "Linked DG Set",
  transformer: "Linked Transformer",

  // DG Audit Record fields
  measured_voltage_LL: "Voltage L-L (V)",
  measured_current_avg: "Current Avg (A)",
  number_of_phase: "No. of Phases",
  max_load_observed_kW: "Max Load Observed (kW)",
  min_load_observed_kW: "Min Load Observed (kW)",
  idle_running_observed: "Idle Running?",
  parallel_operation: "Parallel Operation?",
  annual_fuel_consumption_liters: "Annual Fuel Consumption (L)",
  total_working_hours_per_year: "Total Working Hours/Year",
  units_generated_per_hour_kWh: "Units Generated/Hour (kWh)",
  fuel_consumption_per_hour_liters: "Fuel Consumption/Hour (L)",
  fuel_consumption_during_test_lph: "Fuel Consumption During Test (LPH)",
  units_generated_during_test_kWh: "Units Generated During Test (kWh)",
  time_duration_of_the_test_hours: "Test Duration (hours)",
  units_generated_per_hour_kWh_during_test: "Units/Hour Test (kWh)",
  fuel_consumption_per_hour_liters_during_test: "Fuel/Hour Test (L)",
  specific_fuel_consumption_l_per_kWh_during_test: "SFC Test (L/kWh)",
  manufacturer_sfc_l_per_kWh: "Manufacturer SFC (L/kWh)",
  sfc_deviation_percent: "SFC Deviation (%)",
  sfc_deviation_percent_during_test: "SFC Deviation Test (%)",
  fuel_cost_rs_per_liter: "Fuel Cost (Rs/L)",
  annual_fuel_cost_rs: "Annual Fuel Cost (Rs)",
  manufacturer_efficiency_percent: "Manufacturer Efficiency (%)",
  exhaust_temperature_C: "Exhaust Temperature (°C)",
  cooling_water_temperature_C: "Cooling Water Temperature (°C)",
  lube_oil_pressure_bar: "Lube Oil Pressure (bar)",
  lube_oil_consumption_liters_per_year: "Lube Oil Consumption (L/year)",
  total_operating_hours: "Total Operating Hours",
  hours_since_last_overhaul: "Hours Since Overhaul",

  bill_no: "Bill No",
  billing_period_start: "Billing Period Start",
  billing_period_end: "Billing Period End",
  billing_days: "Billing Days",
  import_kWh: "Import (kWh)",
  import_kVAh: "Import (kVAh)",
  import_kVA: "Import (kVA)",
  export_kWh: "Export (kWh)",
  export_kVAh: "Export (kVAh)",
  export_kVA: "Export (kVA)",
  net_kWh: "Net (kWh)",
  net_kVAh: "Net (kVAh)",
  net_kVA: "Net (kVA)",
  solar_generation_kWh: "Solar Generation (kWh)",
  solar_generation_kVAh: "Solar Generation (kVAh)",
  solar_generation_kVA: "Solar Generation (kVA)",

  plant_name: "Plant Name",
  rating_kWp: "Plant Rating (kWp)",
  panel_rating_watt: "Panel Rating (W)",
  no_of_panels: "Number of Panels",
  inverter_make: "Inverter Make",
  inverter_rating_kW: "Inverter Rating (kW)",
  solar_plant: "Solar Plant",

  dg_number: "DG Number",
  make_model: "Make / Model",
  year_of_installation: "Year of Installation",
  rated_capacity_kVA: "Rated Capacity (kVA)",
  rated_active_power_kW: "Rated Active Power (kW)",
  rated_voltage_V: "Rated Voltage (V)",
  rated_speed_RPM: "Rated Speed (RPM)",
  fuel_type: "Fuel Type",
  dg_set: "DG Set",

  transformer_tag: "Transformer Tag",
  type_of_cooling: "Cooling Type",
  rated_HV_kV: "Rated HV (kV)",
  rated_LV_V: "Rated LV (V)",
  rated_HV_current_A: "Rated HV Current (A)",
  rated_LV_current_A: "Rated LV Current (A)",
  no_load_loss_kW: "No Load Loss (kW)",
  full_load_loss_kW: "Full Load Loss (kW)",
  nameplate_efficiency_percent: "Nameplate Efficiency (%)",
  transformer: "Transformer",

  pump_tag_number: "Pump Tag",
  rated_power_kW_or_HP: "Rated Power (kW/HP)",
  rated_efficiency_motor_percent: "Rated Efficiency (Motor) (%)",
  rated_flow_liters_per_hour: "Rated Flow (Liters/Hour)",
  rated_flow_m3_per_hr: "Rated Flow (m³/hr)",
  rated_head_m: "Rated Head (m)",
  number_of_stages: "Number of Stages",
  pump: "Pump",

  unit_id: "Unit ID",
  building_block: "Building / Block",
  area_location: "Area / Location",
  fixture_type: "Fixture Type",
  fan_type: "Fan Type",
  equipment_name: "Equipment Name",
  category: "Category",
  ac_type: "AC Type",
  make: "Make",
  model: "Model",
  cooling_capacity_TR: "Cooling Capacity (TR)",
  rated_input_power_kW: "Rated Input Power (kW)",
  bee_star_rating: "BEE Star Rating",
  refrigerant: "Refrigerant",
  quantity_nos: "Quantity (Nos)",
  running_status: "Running Status",
  condition: "Condition",
  remarks: "Remarks",
  voltage_V: "Voltage (V)",
  current_A: "Current (A)",
  power_factor: "Power Factor",
  measured_power_kW: "Measured Power (kW)",
  return_air_temp_C: "Return Air Temp (°C)",
  supply_air_temp_C: "Supply Air Temp (°C)",
  ambient_temp_C: "Ambient Temp (°C)",
  thermostat_set_temp_C: "Thermostat Set Temp (°C)",
  operating_hours_per_day: "Operating Hours / Day",
  operating_days_per_year: "Operating Days / Year",
  measurement_remarks: "Measurement Remarks",

  facility_name: "Facility Name",
  location_address: "Location Address",
  client_contact_person: "Client Contact Person",
  contact_number_email: "Contact / Email",
  type_of_facility: "Facility Type",
  total_operating_hours_per_day: "Total Operating Hours / Day",
  hvac_operating_hours_per_day: "HVAC Operating Hours / Day",
  season_ambient_conditions: "Season / Ambient Conditions",
};

const NESTED_GROUP_LABELS: Record<string, string> = {
  pre_audit_information: "Pre-Audit Information",
  documents_records_to_collect: "Documents Checklist",
  hvac_equipment_register: "Equipment Register",
  chiller_field_test: "Chiller Field Test",
  auxiliary_power: "Auxiliary Power",
  cooling_tower_quick_test: "Cooling Tower Test",
  summary: "Summary",
  measurement: "Measurements",
};

export function getPreviewFieldLabel(path: string): string {
  if (PREVIEW_FIELD_LABELS[path]) {
    return PREVIEW_FIELD_LABELS[path];
  }

  const parts = path.split(".");
  const leaf = parts[parts.length - 1] ?? path;

  if (PREVIEW_FIELD_LABELS[leaf]) {
    if (parts.length === 1) {
      return PREVIEW_FIELD_LABELS[leaf];
    }

    const group =
      NESTED_GROUP_LABELS[parts[0]] ?? humanizeNestedKey(parts[0]);
    return `${group} · ${PREVIEW_FIELD_LABELS[leaf]}`;
  }

  if (parts.length > 1) {
    const group =
      NESTED_GROUP_LABELS[parts[0]] ?? humanizeNestedKey(parts[0]);
    return `${group} · ${humanizeNestedKey(leaf)}`;
  }

  return humanizeNestedKey(path);
}
