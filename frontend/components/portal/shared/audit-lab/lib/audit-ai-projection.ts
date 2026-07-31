import { AUDIT_AI_MAX_RECORDS_PER_SECTION, EQUIPMENT_AI_SECTIONS } from "./audit-ai-config";

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

function isIdLikeKey(key: string): boolean {
  if (key.startsWith("__")) return true;
  if (key === "_id" || key === "id") return true;
  return /_id$/i.test(key);
}

function shouldOmitKey(key: string): boolean {
  if (GLOBAL_OMIT.has(key)) return true;
  return isIdLikeKey(key);
}

/** Equipment config fields (tag/name/capacity) — always kept for equipment sections. */
export const EQUIPMENT_FIELD_WHITELISTS: Record<string, string[]> = {
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

/** Per-question field whitelists for audit rows; null = all non-id keys. */
export const QUESTION_FIELD_WHITELISTS: Record<string, string[] | null> = {
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
  lux: [
    "area",
    "required_lux",
    "measured_lux",
    "compliance",
    "utility_account_number",
  ],
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
  savings: null,
  facility_profile: ["name", "city", "address", "facility_type", "audit_type", "audit_date", "status"],
};

const NUMERIC_AGGREGATE_HINTS: Record<string, string[]> = {
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

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

export function projectRecord(
  record: Record<string, unknown>,
  whitelist: string[] | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (shouldOmitKey(key)) {
      if (key === "documents" && Array.isArray(value)) {
        out.document_count = value.length;
      }
      continue;
    }
    if (whitelist && !whitelist.includes(key)) continue;
    out[key] = value;
  }

  return out;
}

function recordSortKey(record: Record<string, unknown>): number {
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

export function sortRecordsNewestFirst(records: Record<string, unknown>[]): Record<string, unknown>[] {
  return [...records].sort((a, b) => recordSortKey(b) - recordSortKey(a));
}

export function computeAggregates(
  records: Record<string, unknown>[],
  questionId: string,
): Record<string, number> {
  const hints = NUMERIC_AGGREGATE_HINTS[questionId] ?? [];
  const aggregates: Record<string, number> = {};

  for (const field of hints) {
    const values = records
      .map((r) => r[field])
      .filter((v) => typeof v === "number" && !Number.isNaN(v)) as number[];
    if (!values.length) continue;
    const sum = values.reduce((a, b) => a + b, 0);
    aggregates[`total_${field}`] = Math.round(sum * 100) / 100;
    aggregates[`avg_${field}`] = Math.round((sum / values.length) * 100) / 100;
    aggregates[`min_${field}`] = Math.min(...values);
    aggregates[`max_${field}`] = Math.max(...values);
  }

  return aggregates;
}

function collectRecordsFromData(data: unknown, questionId: string): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];

  const d = data as Record<string, unknown>;

  if (Array.isArray(d.audit_records)) {
    return d.audit_records.filter(isPlainObject) as Record<string, unknown>[];
  }

  if (Array.isArray(d.records)) {
    return d.records.filter(isPlainObject) as Record<string, unknown>[];
  }

  if (questionId === "billing" && Array.isArray(data)) {
    return (data as unknown[]).flatMap((nest) => {
      if (!isPlainObject(nest)) return [];
      const rows = nest.billing_records;
      return Array.isArray(rows) ? rows.filter(isPlainObject) : [];
    }) as Record<string, unknown>[];
  }

  if (Array.isArray(data)) {
    return data.filter(isPlainObject) as Record<string, unknown>[];
  }

  return [];
}

export interface CompactDataStats {
  record_count: number;
  included_count: number;
  truncated: boolean;
  aggregates: Record<string, number>;
}

export function compactQuestionData(
  data: unknown,
  questionId: string,
  maxRecords = AUDIT_AI_MAX_RECORDS_PER_SECTION,
): { data: unknown; stats: CompactDataStats } {
  const whitelist = QUESTION_FIELD_WHITELISTS[questionId] ?? null;
  const auditWhitelist = EQUIPMENT_AI_SECTIONS.has(questionId) ? null : whitelist;

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;

    if (Array.isArray(d.audit_records) || Array.isArray(d.records)) {
      const key = Array.isArray(d.audit_records) ? "audit_records" : "records";
      const all = (d[key] as unknown[]).filter(isPlainObject) as Record<string, unknown>[];
      const sorted = sortRecordsNewestFirst(all);
      const included = sorted.slice(0, maxRecords).map((r) => projectRecord(r, auditWhitelist));
      const stats: CompactDataStats = {
        record_count: all.length,
        included_count: included.length,
        truncated: included.length < all.length,
        aggregates: computeAggregates(all, questionId),
      };
      const equipmentWhitelist = EQUIPMENT_FIELD_WHITELISTS[questionId];
      const equipment = Array.isArray(d.equipment)
        ? (d.equipment as unknown[])
            .filter(isPlainObject)
            .map((e) =>
              projectRecord(
                e as Record<string, unknown>,
                equipmentWhitelist ?? whitelist,
              ),
            )
        : d.equipment;

      return {
        data: {
          section: d.section,
          audit_record_count: stats.record_count,
          equipment_count: Array.isArray(equipment) ? equipment.length : d.equipment_count,
          stats,
          audit_records: key === "audit_records" ? included : d.audit_records,
          records: key === "records" ? included : d.records,
          equipment,
        },
        stats,
      };
    }
  }

  if (questionId === "billing" && Array.isArray(data)) {
    const allRecords: Record<string, unknown>[] = [];
    const compactNests = (data as unknown[]).map((nest) => {
      if (!isPlainObject(nest)) return nest;
      const rows = Array.isArray(nest.billing_records)
        ? (nest.billing_records.filter(isPlainObject) as Record<string, unknown>[])
        : [];
      allRecords.push(...rows);
      const ua = nest.utility_account as Record<string, unknown> | undefined;
      return {
        utility_account_number: ua?.account_number,
        billing_records: sortRecordsNewestFirst(rows)
          .slice(0, maxRecords)
          .map((r) => projectRecord(r, whitelist)),
      };
    });
    const stats: CompactDataStats = {
      record_count: allRecords.length,
      included_count: Math.min(allRecords.length, maxRecords),
      truncated: allRecords.length > maxRecords,
      aggregates: computeAggregates(allRecords, questionId),
    };
    return { data: { stats, utility_accounts: compactNests }, stats };
  }

  const records = collectRecordsFromData(data, questionId);
  if (records.length > 0) {
    const sorted = sortRecordsNewestFirst(records);
    const included = sorted.slice(0, maxRecords).map((r) => projectRecord(r, whitelist));
    const stats: CompactDataStats = {
      record_count: records.length,
      included_count: included.length,
      truncated: included.length < records.length,
      aggregates: computeAggregates(records, questionId),
    };
    return { data: { stats, records: included }, stats };
  }

  if (Array.isArray(data)) {
    return {
      data: data.map((item) =>
        isPlainObject(item) ? projectRecord(item as Record<string, unknown>, whitelist) : item,
      ),
      stats: {
        record_count: data.length,
        included_count: data.length,
        truncated: false,
        aggregates: {},
      },
    };
  }

  if (isPlainObject(data)) {
    return {
      data,
      stats: { record_count: 0, included_count: 0, truncated: false, aggregates: {} },
    };
  }

  return {
    data,
    stats: { record_count: 0, included_count: 0, truncated: false, aggregates: {} },
  };
}
