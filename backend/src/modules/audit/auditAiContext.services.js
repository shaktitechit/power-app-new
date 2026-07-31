import {
  TABLE_ROW_WHITELISTS,
  resolveCompactionLimits,
} from "./auditAiEnergySections.js";

/** Shared audit AI context limits (keep in sync with frontend audit-ai-config.ts). */
export const AUDIT_AI_MAX_CONTEXT_CHARS = Number(
  process.env.OPENROUTER_MAX_AUDIT_CONTEXT_CHARS || 80000,
);
export const AUDIT_AI_MAX_RECORDS_PER_SECTION = Number(
  process.env.AUDIT_AI_MAX_RECORDS_PER_SECTION || 200,
);
export const AUDIT_AI_MAX_RECORDS_LIST_MODE = Number(
  process.env.AUDIT_AI_MAX_RECORDS_LIST_MODE || 500,
);
export const AUDIT_AI_MIN_RECORDS_FLOOR = Number(process.env.AUDIT_AI_MIN_RECORDS_FLOOR || 25);
export const AUDIT_AI_MIN_RECORDS_FLOOR_LIST = Number(
  process.env.AUDIT_AI_MIN_RECORDS_FLOOR_LIST || 50,
);
export const AUDIT_AI_MAP_REDUCE_THRESHOLD = Number(
  process.env.AUDIT_AI_MAP_REDUCE_THRESHOLD || 100,
);
export const AUDIT_AI_MAP_REDUCE_CHUNK_SIZE = Number(
  process.env.AUDIT_AI_MAP_REDUCE_CHUNK_SIZE || 25,
);
export const AUDIT_AI_RESPONSE_MAX_TOKENS = Number(
  process.env.AUDIT_AI_RESPONSE_MAX_TOKENS || 4096,
);

export const EQUIPMENT_AI_SECTIONS = new Set(["solar", "dg", "transformer", "pump"]);

const GLOBAL_OMIT = new Set([
  "documents",
  "__v",
  "created_at",
  "updated_at",
  "createdAt",
  "updatedAt",
  "deleted_at",
  "facility_id",
  "utility_account_id",
  "auditor_id",
]);

function isIdLikeKey(key) {
  if (key.startsWith("__")) return true;
  if (key === "_id" || key === "id") return true;
  return /_id$/i.test(key);
}

function shouldOmitKey(key) {
  if (GLOBAL_OMIT.has(key)) return true;
  return isIdLikeKey(key);
}

export const EQUIPMENT_FIELD_WHITELISTS = {
  solar: [
    "plant_name",
    "rating_kWp",
    "panel_rating_watt",
    "no_of_panels",
    "inverter_make",
    "inverter_rating_kW",
    "audit_date",
    "utility_account_number",
    "utility_account_location",
    "audit_record_count",
  ],
  dg: [
    "dg_number",
    "make_model",
    "rated_capacity_kVA",
    "rated_active_power_kW",
    "rated_voltage_V",
    "fuel_type",
    "year_of_installation",
    "audit_date",
    "utility_account_number",
    "utility_account_location",
    "audit_record_count",
  ],
  transformer: [
    "transformer_tag",
    "rated_capacity_kVA",
    "type_of_cooling",
    "rated_HV_kV",
    "rated_LV_V",
    "no_load_loss_kW",
    "full_load_loss_kW",
    "nameplate_efficiency_percent",
    "audit_date",
    "utility_account_number",
    "utility_account_location",
    "audit_record_count",
  ],
  pump: [
    "pump_tag_number",
    "make_model",
    "rated_power_kW_or_HP",
    "rated_flow_m3_per_hr",
    "rated_head_m",
    "rated_speed_RPM",
    "year_of_installation",
    "audit_date",
    "utility_account_number",
    "utility_account_location",
    "audit_record_count",
  ],
};

export const QUESTION_FIELD_WHITELISTS = {
  overview: null,
  tariff: [
    "effective_from",
    "effective_to",
    "energy_charge",
    "fixed_charge",
    "demand_charge",
    "tariff_name",
    "utility_account_number",
  ],
  billing: [
    "billing_period_start",
    "billing_period_end",
    "bill_no",
    "import_kWh",
    "import_kVAh",
    "import_kVA",
    "MDI",
    "power_factor",
    "total_amount",
    "penalty_rs",
    "demand_charges_rs",
    "energy_charges_rs",
    "utility_account_number",
  ],
  solar: [
    "solar_plant",
    "plant_name",
    "billing_period_start",
    "billing_period_end",
    "bill_no",
    "import_kWh",
    "import_kVAh",
    "export_kWh",
    "net_kWh",
    "solar_generation_kWh",
    "solar_generation_kVAh",
    "audit_date",
    "utility_account_number",
    "utility_account_location",
    "is_completed",
  ],
  dg: [
    "dg_set",
    "dg_number",
    "measured_kW_output",
    "measured_kVA_output",
    "power_factor",
    "max_load_observed_kW",
    "average_loading_percent",
    "load_factor_percent",
    "specific_fuel_consumption_l_per_kWh",
    "units_generated_per_year_kWh",
    "annual_fuel_consumption_liters",
    "audit_date",
    "utility_account_number",
    "utility_account_location",
    "is_completed",
  ],
  transformer: [
    "transformer",
    "transformer_tag",
    "percent_loading",
    "total_losses_kW",
    "average_load_kVA",
    "max_load_kVA",
    "power_factor_LT",
    "annual_energy_supplied_kWh",
    "annual_energy_losses_kWh",
    "load_factor_percent",
    "audit_date",
    "utility_account_number",
    "utility_account_location",
    "is_completed",
  ],
  pump: [
    "pump",
    "pump_tag_number",
    "actual_flow_m3_per_hr",
    "motor_loading_percent",
    "specific_energy_consumption_kWh_per_m3",
    "pump_efficiency_percent",
    "input_power_kW",
    "total_dynamic_head_m",
    "annual_energy_consumption_kWh",
    "audit_date",
    "utility_account_number",
    "utility_account_location",
    "is_completed",
  ],
  hvac: [
    "audit_date",
    "cooling_produced_TR",
    "plant_power_kW",
    "efficiency_kW_per_TR",
    "COP",
    "utility_account_number",
  ],
  ac: [
    "audit_date",
    "connected_load_kW",
    "specific_power_kW_per_TR",
    "annual_energy_kWh",
    "utility_account_number",
  ],
  lighting: [
    "audit_date",
    "fixture_count",
    "wattage",
    "connected_load_kW",
    "annual_energy_kWh",
    "utility_account_number",
  ],
  lux: ["area", "required_lux", "measured_lux", "compliance", "utility_account_number"],
  ups: [
    "audit_date",
    "rated_capacity_kVA",
    "loading_percent",
    "efficiency_percent",
    "battery_age_years",
    "utility_account_number",
  ],
  misc: [
    "equipment_name",
    "load_kW",
    "load_factor",
    "annual_energy_kWh",
    "utility_account_number",
  ],
  fan: null,
  street_light: null,
  ups: null,
  savings: null,
  facility_profile: ["name", "city", "address", "facility_type", "audit_type", "audit_date", "status"],
};

const NUMERIC_AGGREGATE_HINTS = {
  billing: [
    "import_kWh",
    "import_kVAh",
    "import_kVA",
    "MDI",
    "power_factor",
    "total_amount",
    "penalty_rs",
  ],
  solar: ["solar_generation_kWh", "import_kWh", "export_kWh", "net_kWh"],
  dg: ["measured_kW_output", "power_factor", "max_load_observed_kW", "SFC"],
  transformer: ["percent_loading", "total_losses_kW", "power_factor_LT", "average_load_kVA"],
  pump: [
    "actual_flow_m3_per_hr",
    "motor_loading_percent",
    "specific_energy_consumption_kWh_per_m3",
    "pump_efficiency_percent",
  ],
};

function isPlainObject(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

export function projectRecord(record, whitelist) {
  const out = {};
  for (const [key, value] of Object.entries(record || {})) {
    if (shouldOmitKey(key)) {
      if (key === "documents" && Array.isArray(value)) out.document_count = value.length;
      continue;
    }
    if (whitelist && !whitelist.includes(key)) continue;
    out[key] = value;
  }
  return out;
}

function recordSortKey(record) {
  for (const field of [
    "billing_period_end",
    "billing_period_start",
    "audit_date",
    "createdAt",
    "created_at",
  ]) {
    const v = record[field];
    if (v) {
      const t = Date.parse(String(v));
      if (!Number.isNaN(t)) return t;
    }
  }
  return 0;
}

function sortRecordsNewestFirst(records) {
  return [...records].sort((a, b) => recordSortKey(b) - recordSortKey(a));
}

export function computeAggregates(records, questionId) {
  const hints = NUMERIC_AGGREGATE_HINTS[questionId] || [];
  const aggregates = {};
  for (const field of hints) {
    const values = records
      .map((r) => r[field])
      .filter((v) => typeof v === "number" && !Number.isNaN(v));
    if (!values.length) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    aggregates[`total_${field}`] = Math.round(sum * 100) / 100;
    aggregates[`avg_${field}`] = Math.round((sum / values.length) * 100) / 100;
    aggregates[`min_${field}`] = Math.min(...values);
    aggregates[`max_${field}`] = Math.max(...values);
  }
  return aggregates;
}

export function compactQuestionData(
  data,
  questionId,
  maxRecords = AUDIT_AI_MAX_RECORDS_PER_SECTION,
  options = {},
) {
  const listMode = options.listMode === true;
  const whitelist = QUESTION_FIELD_WHITELISTS[questionId] ?? null;
  const tableWhitelist = TABLE_ROW_WHITELISTS[questionId] ?? whitelist;
  const auditWhitelist = EQUIPMENT_AI_SECTIONS.has(questionId)
    ? listMode
      ? tableWhitelist
      : null
    : listMode
      ? tableWhitelist
      : whitelist;

  if (isPlainObject(data)) {
    if (Array.isArray(data.audit_records) || Array.isArray(data.records)) {
      const key = Array.isArray(data.audit_records) ? "audit_records" : "records";
      const all = data[key].filter(isPlainObject);
      const sorted = sortRecordsNewestFirst(all);
      const included = sorted.slice(0, maxRecords).map((r) => projectRecord(r, auditWhitelist));
      const stats = {
        record_count: all.length,
        included_count: included.length,
        truncated: included.length < all.length,
        aggregates: computeAggregates(all, questionId),
        list_mode: listMode,
      };
      const equipmentWhitelist = EQUIPMENT_FIELD_WHITELISTS[questionId];
      const equipment = Array.isArray(data.equipment)
        ? data.equipment
            .filter(isPlainObject)
            .map((e) => projectRecord(e, equipmentWhitelist ?? whitelist))
        : data.equipment;

      return {
        data: {
          section: data.section,
          audit_record_count: stats.record_count,
          equipment_count: Array.isArray(equipment) ? equipment.length : data.equipment_count,
          stats,
          audit_records: key === "audit_records" ? included : data.audit_records,
          records: key === "records" ? included : data.records,
          equipment,
        },
        stats,
      };
    }
  }

  if (questionId === "billing" && Array.isArray(data)) {
    const allRecords = [];
    const compactNests = data.map((nest) => {
      if (!isPlainObject(nest)) return nest;
      const rows = Array.isArray(nest.billing_records)
        ? nest.billing_records.filter(isPlainObject)
        : [];
      allRecords.push(...rows);
      const ua = nest.utility_account;
      return {
        utility_account_number: ua?.account_number,
        billing_records: sortRecordsNewestFirst(rows)
          .slice(0, maxRecords)
          .map((r) => projectRecord(r, whitelist)),
      };
    });
    const stats = {
      record_count: allRecords.length,
      included_count: Math.min(allRecords.length, maxRecords),
      truncated: allRecords.length > maxRecords,
      aggregates: computeAggregates(allRecords, questionId),
    };
    return { data: { stats, utility_accounts: compactNests }, stats };
  }

  if (Array.isArray(data?.records)) {
    const all = data.records.filter(isPlainObject);
    const sorted = sortRecordsNewestFirst(all);
    const included = sorted.slice(0, maxRecords).map((r) => projectRecord(r, whitelist));
    const stats = {
      record_count: all.length,
      included_count: included.length,
      truncated: included.length < all.length,
      aggregates: computeAggregates(all, questionId),
    };
    return { data: { stats, records: included }, stats };
  }

  return {
    data,
    stats: { record_count: 0, included_count: 0, truncated: false, aggregates: {} },
  };
}

export function buildCompactPayload(rawPayload, options = {}) {
  const limits = resolveCompactionLimits(options, options.user_text ?? "");
  const maxChars = limits.maxChars;
  const maxRecords = limits.maxRecords;
  const minFloor = limits.minRecordsFloor;
  const questionId = rawPayload.question_id || "overview";

  const { data: compactData, stats } = compactQuestionData(rawPayload.data, questionId, maxRecords, {
    listMode: limits.listMode,
  });

  const facility = rawPayload.facility || {};
  let payload = {
    audit_type: rawPayload.audit_type,
    facility: {
      name: facility.name,
      city: facility.city,
      facility_type: facility.facility_type,
    },
    question: rawPayload.question,
    question_id: questionId,
    data: compactData,
  };

  let payloadTruncated = false;
  let json = JSON.stringify(payload);

  if (
    json.length > maxChars &&
    payload.data?.equipment &&
    !EQUIPMENT_AI_SECTIONS.has(questionId)
  ) {
    delete payload.data.equipment;
    json = JSON.stringify(payload);
  }

  if (json.length > maxChars && Array.isArray(payload.data?.audit_records)) {
    const tableWhitelist = TABLE_ROW_WHITELISTS[questionId];
    if (tableWhitelist) {
      payload.data.audit_records = payload.data.audit_records.map((r) => projectRecord(r, tableWhitelist));
      json = JSON.stringify(payload);
    }

    let step = payload.data.audit_records.length;
    while (step > minFloor && JSON.stringify(payload).length > maxChars) {
      step = Math.max(minFloor, Math.floor(step * 0.85));
      payload.data.audit_records = payload.data.audit_records.slice(0, step);
      stats.included_count = step;
      stats.truncated = true;
      json = JSON.stringify(payload);
    }
  }

  if (json.length > maxChars && Array.isArray(payload.data?.records)) {
    let step = payload.data.records.length;
    while (step > minFloor && JSON.stringify(payload).length > maxChars) {
      step = Math.max(minFloor, Math.floor(step * 0.85));
      payload.data.records = payload.data.records.slice(0, step);
      stats.included_count = step;
      stats.truncated = true;
      json = JSON.stringify(payload);
    }
  }

  if (json.length > maxChars && !EQUIPMENT_AI_SECTIONS.has(questionId)) {
    json = json.slice(0, maxChars);
    payloadTruncated = true;
  } else if (json.length > maxChars) {
    payloadTruncated = true;
  }

  return {
    compact_payload: payload,
    json,
    meta: {
      total_records: stats.record_count,
      included_records: stats.included_count,
      truncated: stats.truncated || payloadTruncated,
      payload_truncated: payloadTruncated,
      compact_mode: true,
      list_mode: limits.listMode,
      char_count: json.length,
      max_chars: maxChars,
    },
    stats,
  };
}
