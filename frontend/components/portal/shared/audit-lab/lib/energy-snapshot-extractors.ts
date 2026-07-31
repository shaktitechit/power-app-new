import type { FacilityAuditEnergyUtilityNest } from "@/store/slices/auditApiSlice";
import { isIdLikeFieldKey } from "@/components/portal/lib/audit-snapshot-table-utils";

const AI_OMIT_KEYS = new Set([
  "documents",
  "__v",
  "created_at",
  "updated_at",
  "createdAt",
  "updatedAt",
  "deleted_at",
  "facility_id",
  "utility_account_id",
  "utility_account",
  "auditor_id",
]);

function shouldOmitKey(key: string): boolean {
  if (AI_OMIT_KEYS.has(key)) return true;
  return isIdLikeFieldKey(key);
}

function pickFields(
  record: Record<string, unknown>,
  allowKeys: string[],
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowKeys) {
    if (shouldOmitKey(key)) {
      if (key === "documents" && Array.isArray(record[key])) {
        out.document_count = record[key].length;
      }
      continue;
    }
    const value = record[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

/** Strip attachments, Mongo IDs, and heavy blobs; keep audit measurements. */
export function sanitizeRecordForAi(record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (shouldOmitKey(key)) {
      if (key === "documents" && Array.isArray(value)) {
        out.document_count = value.length;
      }
      continue;
    }

    if (key === "utility_account" && value && typeof value === "object") {
      const ua = value as Record<string, unknown>;
      out.utility_account_number = ua.account_number ?? ua.accountNumber;
      if (ua.location) out.utility_account_location = ua.location;
      continue;
    }

    if (Array.isArray(value)) {
      if (
        key === "solar_generation_records" ||
        key === "dg_audit_records" ||
        key === "transformer_audit_records" ||
        key === "pump_audit_records"
      ) {
        out[key] = value.map((item) =>
          item && typeof item === "object"
            ? sanitizeRecordForAi(item as Record<string, unknown>)
            : item,
        );
      } else {
        out[key] = value;
      }
      continue;
    }

    if (value && typeof value === "object" && !(value instanceof Date)) {
      continue;
    }

    out[key] = value;
  }

  return out;
}

type EquipmentConfig = {
  equipmentKey: keyof FacilityAuditEnergyUtilityNest;
  auditKey:
    | "solar_generation_records"
    | "dg_audit_records"
    | "transformer_audit_records"
    | "pump_audit_records";
  labelField: string;
  /** Human-readable key on audit rows (matches Audit Lab preview sheet). */
  auditParentLabelField: string;
  auditParentIdField: string;
  equipmentFields: string[];
};

export const EQUIPMENT_AI_CONFIGS: Record<string, EquipmentConfig> = {
  solar: {
    equipmentKey: "solar_plants",
    auditKey: "solar_generation_records",
    labelField: "plant_name",
    auditParentLabelField: "solar_plant",
    auditParentIdField: "solar_plant_id",
    equipmentFields: [
      "plant_name",
      "rating_kWp",
      "panel_rating_watt",
      "no_of_panels",
      "inverter_make",
      "inverter_rating_kW",
      "audit_date",
    ],
  },
  dg: {
    equipmentKey: "dg_sets",
    auditKey: "dg_audit_records",
    labelField: "dg_number",
    auditParentLabelField: "dg_set",
    auditParentIdField: "dg_set_id",
    equipmentFields: [
      "dg_number",
      "make_model",
      "rated_capacity_kVA",
      "rated_active_power_kW",
      "rated_voltage_V",
      "fuel_type",
      "year_of_installation",
      "audit_date",
    ],
  },
  transformer: {
    equipmentKey: "transformers",
    auditKey: "transformer_audit_records",
    labelField: "transformer_tag",
    auditParentLabelField: "transformer",
    auditParentIdField: "transformer_id",
    equipmentFields: [
      "transformer_tag",
      "rated_capacity_kVA",
      "type_of_cooling",
      "rated_HV_kV",
      "rated_LV_V",
      "no_load_loss_kW",
      "full_load_loss_kW",
      "nameplate_efficiency_percent",
      "audit_date",
    ],
  },
  pump: {
    equipmentKey: "pumps",
    auditKey: "pump_audit_records",
    labelField: "pump_tag_number",
    auditParentLabelField: "pump",
    auditParentIdField: "pump_id",
    equipmentFields: [
      "pump_tag_number",
      "make_model",
      "rated_power_kW_or_HP",
      "rated_flow_m3_per_hr",
      "rated_head_m",
      "rated_speed_RPM",
      "year_of_installation",
      "audit_date",
    ],
  },
};

function resolveEquipmentLabel(
  item: Record<string, unknown>,
  config: EquipmentConfig,
): string {
  const raw = item[config.labelField];
  const label = raw == null ? "" : String(raw).trim();
  if (label) return label;
  return `Unnamed ${config.auditParentLabelField.replace(/_/g, " ")}`;
}

function resolveMongoId(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object") {
    const obj = value as { _id?: unknown; toHexString?: () => string; toString?: () => string };
    if (obj._id != null) return String(obj._id);
    if (typeof obj.toHexString === "function") return obj.toHexString();
    const asString = typeof obj.toString === "function" ? obj.toString() : "";
    if (/^[a-f0-9]{24}$/i.test(asString)) return asString;
    return "";
  }
  const s = String(value).trim();
  return s && s !== "[object Object]" ? s : "";
}

/** Flatten a utility-nest array field into records for AI compaction. */
export function extractFlatRecords(
  accounts: FacilityAuditEnergyUtilityNest[],
  section: string,
  recordsKey: keyof FacilityAuditEnergyUtilityNest | string,
): Record<string, unknown> {
  const records: Record<string, unknown>[] = [];
  for (const nest of accounts) {
    const ua = nest.utility_account as Record<string, unknown> | undefined;
    const accountNumber = ua?.account_number ?? ua?.accountNumber;
    const accountLocation = ua?.location;
    const rows = (nest as Record<string, unknown>)[recordsKey as string];
    if (!Array.isArray(rows)) continue;
    for (const rec of rows) {
      if (!rec || typeof rec !== "object") continue;
      records.push({
        ...sanitizeRecordForAi(rec as Record<string, unknown>),
        utility_account_number: accountNumber,
        utility_account_location: accountLocation,
      });
    }
  }
  return {
    section,
    record_count: records.length,
    records,
    audit_records: records,
  };
}

function auditRecordKey(
  record: Record<string, unknown>,
  parentLabelField: string,
  parentLabel: string,
): string {
  const parts = [
    parentLabel || record[parentLabelField],
    record.audit_date,
    record.billing_period_start,
    record.billing_period_end,
    record.bill_no,
  ]
    .filter(Boolean)
    .map(String);
  return parts.join("|") || JSON.stringify(record).slice(0, 120);
}

function enrichAuditRecord(
  record: Record<string, unknown>,
  config: EquipmentConfig,
  parentLabel: string,
  accountNumber: unknown,
  accountLocation: unknown,
): Record<string, unknown> {
  const sanitized = sanitizeRecordForAi(record);
  delete sanitized[config.auditParentIdField];
  return {
    ...sanitized,
    utility_account_number: accountNumber,
    utility_account_location: accountLocation,
    [config.auditParentLabelField]: parentLabel,
  };
}

/**
 * Flatten equipment config + nested audit rows for AI.
 * Uses tag/name labels only — no Mongo IDs. Both equipment and audit_records are included.
 */
export function extractEquipmentWithAuditRecords(
  accounts: FacilityAuditEnergyUtilityNest[],
  section: keyof typeof EQUIPMENT_AI_CONFIGS,
): Record<string, unknown> {
  const config = EQUIPMENT_AI_CONFIGS[section];
  if (!config) return { audit_records: [], equipment: [] };

  const equipment: Record<string, unknown>[] = [];
  const audit_records: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  const pushAuditRecord = (
    record: unknown,
    parentLabel: string,
    accountNumber: unknown,
    accountLocation: unknown,
  ) => {
    if (!record || typeof record !== "object") return;
    const enriched = enrichAuditRecord(
      record as Record<string, unknown>,
      config,
      parentLabel,
      accountNumber,
      accountLocation,
    );
    const key = auditRecordKey(enriched, config.auditParentLabelField, parentLabel);
    if (seen.has(key)) return;
    seen.add(key);
    audit_records.push(enriched);
  };

  for (const nest of accounts) {
    const ua = nest.utility_account as Record<string, unknown> | undefined;
    const accountNumber = ua?.account_number ?? ua?.accountNumber;
    const accountLocation = ua?.location;

    const labelByParentId = new Map<string, string>();
    const nestRecord = nest as Record<string, unknown>;

    for (const raw of (nest[config.equipmentKey] as unknown[]) ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      labelByParentId.set(resolveMongoId(item._id), resolveEquipmentLabel(item, config));
    }

    for (const raw of (nest[config.equipmentKey] as unknown[]) ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const item = raw as Record<string, unknown>;
      const parentLabel = resolveEquipmentLabel(item, config);
      const parentId = resolveMongoId(item._id);
      if (parentId) labelByParentId.set(parentId, parentLabel);

      const nested = Array.isArray(item[config.auditKey]) ? item[config.auditKey] : [];

      const { [config.auditKey]: _audit, ...equipmentOnly } = item;
      equipment.push(
        pickFields(
          {
            ...equipmentOnly,
            utility_account_number: accountNumber,
            utility_account_location: accountLocation,
            audit_record_count: nested.length,
          },
          [
            ...config.equipmentFields,
            "utility_account_number",
            "utility_account_location",
            "audit_record_count",
          ],
        ),
      );

      for (const rec of nested) {
        pushAuditRecord(rec, parentLabel, accountNumber, accountLocation);
      }
    }

    const flatRows = nestRecord[config.auditKey];
    if (Array.isArray(flatRows)) {
      for (const rec of flatRows) {
        if (!rec || typeof rec !== "object") continue;
        const row = rec as Record<string, unknown>;
        const parentId = resolveMongoId(row[config.auditParentIdField]);
        const parentLabel =
          labelByParentId.get(parentId) ||
          resolveEquipmentLabel(row, config);
        pushAuditRecord(row, parentLabel, accountNumber, accountLocation);
      }
    }
  }

  for (const row of equipment) {
    const label = row[config.labelField];
    row.audit_record_count = audit_records.filter(
      (rec) => rec[config.auditParentLabelField] === label,
    ).length;
  }

  return {
    section,
    audit_record_count: audit_records.length,
    equipment_count: equipment.length,
    audit_records,
    equipment,
  };
}

export function countNestedAuditRecords(
  accounts: FacilityAuditEnergyUtilityNest[],
  auditKey: EquipmentConfig["auditKey"],
  equipmentKey: EquipmentConfig["equipmentKey"],
): number {
  let total = 0;
  for (const nest of accounts) {
    for (const raw of (nest[equipmentKey] as unknown[]) ?? []) {
      if (!raw || typeof raw !== "object") continue;
      const nested = (raw as Record<string, unknown>)[auditKey];
      if (Array.isArray(nested)) total += nested.length;
    }
    const flat = (nest as Record<string, unknown>)[auditKey];
    if (Array.isArray(flat)) total += flat.length;
  }
  return total;
}
