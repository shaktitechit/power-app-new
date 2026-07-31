/** Electrical energy audit section → utility nest array key (keep in sync with facilityAuditAggregate). */
export const FLAT_ENERGY_SECTIONS = {
  tariff: "tariffs",
  billing: "billing_records",
  hvac: "hvac_audits",
  ac: "ac_audit_records",
  lighting: "lighting_audits",
  lux: "lux_measurements",
  misc: "misc_load_audits",
  fan: "fan_audit_records",
  street_light: "street_light_audits",
  ups: "ups_audits",
};

export const EQUIPMENT_ENERGY_SECTIONS = new Set(["solar", "dg", "transformer", "pump"]);

/** Slim columns for table/list mode — keeps more rows within char budget. */
export const TABLE_ROW_WHITELISTS = {
  billing: [
    "utility_account_number",
    "billing_period_start",
    "billing_period_end",
    "bill_no",
    "import_kWh",
    "import_kVAh",
    "MDI",
    "power_factor",
    "total_amount",
    "penalty_rs",
  ],
  solar: [
    "solar_plant",
    "billing_period_start",
    "billing_period_end",
    "solar_generation_kWh",
    "import_kWh",
    "export_kWh",
    "net_kWh",
    "utility_account_number",
  ],
  dg: [
    "dg_set",
    "measured_kW_output",
    "power_factor",
    "max_load_observed_kW",
    "specific_fuel_consumption_l_per_kWh",
    "audit_date",
    "utility_account_number",
  ],
  transformer: [
    "transformer",
    "percent_loading",
    "total_losses_kW",
    "power_factor_LT",
    "average_load_kVA",
    "audit_date",
    "utility_account_number",
  ],
  pump: [
    "pump",
    "actual_flow_m3_per_hr",
    "motor_loading_percent",
    "specific_energy_consumption_kWh_per_m3",
    "pump_efficiency_percent",
    "audit_date",
    "utility_account_number",
  ],
  hvac: ["utility_account_number", "audit_date", "cooling_produced_TR", "plant_power_kW", "COP"],
  ac: ["utility_account_number", "area_location", "connected_load_kW", "specific_power_kW_per_TR", "annual_energy_kWh"],
  lighting: ["utility_account_number", "area_location", "fixture_count", "wattage", "connected_load_kW"],
  lux: ["utility_account_number", "area_location", "required_lux", "measured_lux", "compliance"],
  fan: ["utility_account_number", "area_location", "fan_type", "connected_load_kW", "annual_energy_kWh"],
  street_light: ["utility_account_number", "area_location", "fixture_count", "wattage_per_fixture", "connected_load_kW"],
  ups: ["utility_account_number", "ups_tag_asset_id", "rated_capacity_kVA", "loading_kVA_percent", "input_power_factor"],
  misc: ["utility_account_number", "equipment_name", "location_department", "load_kW", "annual_energy_kWh"],
  tariff: ["utility_account_number", "tariff_name", "effective_from", "effective_to", "energy_charge"],
};

export function wantsFullRecordList(text) {
  if (!text || typeof text !== "string") return false;
  return /\b(all|every|full|complete|entire|whole|list|table|tabular|show all|each row|all records|all rows)\b/i.test(
    text,
  );
}

export function resolveCompactionLimits(options = {}, userText = "") {
  const listMode = options.list_mode === true || wantsFullRecordList(userText);
  return {
    listMode,
    maxRecords: Number(
      options.max_records ??
        (listMode ? process.env.AUDIT_AI_MAX_RECORDS_LIST_MODE || 500 : process.env.AUDIT_AI_MAX_RECORDS_PER_SECTION || 200),
    ),
    maxChars: Number(options.max_chars ?? process.env.OPENROUTER_MAX_AUDIT_CONTEXT_CHARS ?? 80000),
    minRecordsFloor: Number(listMode ? process.env.AUDIT_AI_MIN_RECORDS_FLOOR_LIST || 50 : process.env.AUDIT_AI_MIN_RECORDS_FLOOR || 25),
  };
}
