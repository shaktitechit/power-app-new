function isIdLikeKey(key) {
  if (key.startsWith("__")) return true;
  if (key === "_id" || key === "id") return true;
  return /_id$/i.test(key);
}

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

function shouldOmitKey(key) {
  if (AI_OMIT_KEYS.has(key)) return true;
  return isIdLikeKey(key);
}

function pickFields(record, allowKeys) {
  const out = {};
  for (const key of allowKeys) {
    if (shouldOmitKey(key)) {
      if (key === "documents" && Array.isArray(record[key])) out.document_count = record[key].length;
      continue;
    }
    const value = record[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

function sanitizeRecord(record) {
  const out = {};
  for (const [k, v] of Object.entries(record || {})) {
    if (shouldOmitKey(k)) {
      if (k === "documents" && Array.isArray(v)) out.document_count = v.length;
      continue;
    }
    if (k === "utility_account" && v && typeof v === "object") {
      out.utility_account_number = v.account_number;
      if (v.location) out.utility_account_location = v.location;
      continue;
    }
    if (Array.isArray(v)) {
      out[k] = v.map((item) =>
        item && typeof item === "object" ? sanitizeRecord(item) : item,
      );
      continue;
    }
    if (v && typeof v === "object" && !(v instanceof Date)) continue;
    out[k] = v;
  }
  return out;
}

const EQUIPMENT_AI_CONFIGS = {
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

function resolveEquipmentLabel(item, config) {
  const raw = item[config.labelField];
  const label = raw == null ? "" : String(raw).trim();
  if (label) return label;
  return `Unnamed ${config.auditParentLabelField.replace(/_/g, " ")}`;
}

function countNestedAuditRecords(nest, auditKey, equipmentKey) {
  let total = 0;
  for (const item of nest[equipmentKey] || []) {
    const nested = item?.[auditKey];
    if (Array.isArray(nested)) total += nested.length;
  }
  if (Array.isArray(nest[auditKey])) total += nest[auditKey].length;
  return total;
}

function extractFlatRecords(accounts, section, recordsKey) {
  const records = [];
  for (const nest of accounts) {
    const ua = nest.utility_account;
    const accountNumber = ua?.account_number;
    const accountLocation = ua?.location;
    const rows = Array.isArray(nest[recordsKey]) ? nest[recordsKey] : [];
    for (const rec of rows) {
      if (!rec || typeof rec !== "object") continue;
      records.push({
        ...sanitizeRecord(rec),
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

function resolveMongoId(value) {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value._id != null) return String(value._id);
    if (typeof value.toHexString === "function") return value.toHexString();
    const asString = typeof value.toString === "function" ? value.toString() : "";
    if (/^[a-f0-9]{24}$/i.test(asString)) return asString;
    return "";
  }
  const s = String(value).trim();
  return s && s !== "[object Object]" ? s : "";
}

function auditRecordKey(record, parentLabelField, parentLabel) {
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

function enrichAuditRecord(record, config, parentLabel, accountNumber, accountLocation) {
  const sanitized = sanitizeRecord(record);
  delete sanitized[config.auditParentIdField];
  return {
    ...sanitized,
    utility_account_number: accountNumber,
    utility_account_location: accountLocation,
    [config.auditParentLabelField]: parentLabel,
  };
}

function extractEquipmentWithAuditRecords(accounts, section) {
  const config = EQUIPMENT_AI_CONFIGS[section];
  if (!config) return { audit_records: [], equipment: [] };

  const equipment = [];
  const audit_records = [];
  const seen = new Set();

  const pushAuditRecord = (record, parentLabel, accountNumber, accountLocation) => {
    if (!record || typeof record !== "object") return;
    const enriched = enrichAuditRecord(
      record,
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
    const ua = nest.utility_account;
    const accountNumber = ua?.account_number;
    const accountLocation = ua?.location;

    const labelByParentId = new Map();
    for (const item of nest[config.equipmentKey] || []) {
      if (!item || typeof item !== "object") continue;
      labelByParentId.set(resolveMongoId(item._id), resolveEquipmentLabel(item, config));
    }

    for (const item of nest[config.equipmentKey] || []) {
      if (!item || typeof item !== "object") continue;
      const parentLabel = resolveEquipmentLabel(item, config);
      const parentId = resolveMongoId(item._id);
      if (parentId) labelByParentId.set(parentId, parentLabel);

      const nested = Array.isArray(item[config.auditKey]) ? item[config.auditKey] : [];

      const equipmentRow = { ...item };
      delete equipmentRow[config.auditKey];
      equipment.push(
        pickFields(
          {
            ...equipmentRow,
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

    // Fallback: flat audit arrays on utility nest (when nested join missed rows)
    const flatRows = Array.isArray(nest[config.auditKey]) ? nest[config.auditKey] : [];
    for (const rec of flatRows) {
      const parentId = resolveMongoId(rec?.[config.auditParentIdField]);
      const parentLabel =
        labelByParentId.get(parentId) ||
        resolveEquipmentLabel(rec || {}, config) ||
        `Unnamed ${config.auditParentLabelField.replace(/_/g, " ")}`;
      pushAuditRecord(rec, parentLabel, accountNumber, accountLocation);
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

function countEnergyRecords(accounts) {
  return accounts.reduce(
    (acc, nest) => {
      acc.tariffs += nest.tariffs?.length ?? 0;
      acc.billing += nest.billing_records?.length ?? 0;
      acc.solar_plants += nest.solar_plants?.length ?? 0;
      acc.solar_generation_records += countNestedAuditRecords(nest, "solar_generation_records", "solar_plants");
      acc.dg_sets += nest.dg_sets?.length ?? 0;
      acc.dg_audit_records += countNestedAuditRecords(nest, "dg_audit_records", "dg_sets");
      acc.transformers += nest.transformers?.length ?? 0;
      acc.transformer_audit_records += countNestedAuditRecords(nest, "transformer_audit_records", "transformers");
      acc.pumps += nest.pumps?.length ?? 0;
      acc.pump_audit_records += countNestedAuditRecords(nest, "pump_audit_records", "pumps");
      acc.hvac += nest.hvac_audits?.length ?? 0;
      acc.lighting += nest.lighting_audits?.length ?? 0;
      acc.lux += nest.lux_measurements?.length ?? 0;
      acc.misc += nest.misc_load_audits?.length ?? 0;
      acc.ac += nest.ac_audit_records?.length ?? 0;
      acc.fan += nest.fan_audit_records?.length ?? 0;
      acc.street_light += nest.street_light_audits?.length ?? 0;
      acc.ups += nest.ups_audits?.length ?? 0;
      return acc;
    },
    {
      tariffs: 0,
      billing: 0,
      solar_plants: 0,
      solar_generation_records: 0,
      dg_sets: 0,
      dg_audit_records: 0,
      transformers: 0,
      transformer_audit_records: 0,
      pumps: 0,
      pump_audit_records: 0,
      hvac: 0,
      lighting: 0,
      lux: 0,
      misc: 0,
      ac: 0,
      fan: 0,
      street_light: 0,
      ups: 0,
    },
  );
}

export function extractEnergyQuestionData(snapshot, questionId) {
  const accounts = snapshot.utility_accounts ?? [];

  switch (questionId) {
    case "overview":
      return {
        facility: snapshot.facility,
        utility_account_count: accounts.length,
        record_counts: countEnergyRecords(accounts),
      };
    case "tariff":
      return extractFlatRecords(accounts, "tariff", "tariffs");
    case "billing":
      return extractFlatRecords(accounts, "billing", "billing_records");
    case "solar":
      return extractEquipmentWithAuditRecords(accounts, "solar");
    case "dg":
      return extractEquipmentWithAuditRecords(accounts, "dg");
    case "transformer":
      return extractEquipmentWithAuditRecords(accounts, "transformer");
    case "pump":
      return extractEquipmentWithAuditRecords(accounts, "pump");
    case "hvac":
      return extractFlatRecords(accounts, "hvac", "hvac_audits");
    case "ac":
      return extractFlatRecords(accounts, "ac", "ac_audit_records");
    case "lighting":
      return extractFlatRecords(accounts, "lighting", "lighting_audits");
    case "lux":
      return extractFlatRecords(accounts, "lux", "lux_measurements");
    case "fan":
      return extractFlatRecords(accounts, "fan", "fan_audit_records");
    case "street_light":
      return extractFlatRecords(accounts, "street_light", "street_light_audits");
    case "ups":
      return extractFlatRecords(accounts, "ups", "ups_audits");
    case "misc":
      return extractFlatRecords(accounts, "misc", "misc_load_audits");
    case "savings":
      return {
        facility: snapshot.facility,
        record_counts: countEnergyRecords(accounts),
        solar: extractEquipmentWithAuditRecords(accounts, "solar"),
        dg: extractEquipmentWithAuditRecords(accounts, "dg"),
        transformer: extractEquipmentWithAuditRecords(accounts, "transformer"),
        pump: extractEquipmentWithAuditRecords(accounts, "pump"),
      };
    default:
      return accounts;
  }
}

export function extractSafetyQuestionData(snapshot, questionId) {
  const accounts = snapshot.utility_accounts ?? [];

  if (questionId === "overview") {
    const sectionCounts = {};
    for (const nest of accounts) {
      for (const [key, rows] of Object.entries(nest.safety_sections ?? {})) {
        sectionCounts[key] = (sectionCounts[key] ?? 0) + (Array.isArray(rows) ? rows.length : 0);
      }
    }
    return { facility: snapshot.facility, utility_account_count: accounts.length, section_counts: sectionCounts };
  }

  return accounts.map((nest) => ({
    utility_account: nest.utility_account,
    section: questionId,
    records: (nest.safety_sections?.[questionId] ?? []).map(sanitizeRecord),
  }));
}

export function buildRawQuestionPayload({ auditType, facility, snapshot, question }) {
  let data;
  if (auditType === "Electrical Energy Audit" && snapshot) {
    data = extractEnergyQuestionData(snapshot, question.id);
  } else if (auditType === "Electrical Safety Audit" && snapshot) {
    data = extractSafetyQuestionData(snapshot, question.id);
  } else {
    data = {
      facility: {
        name: facility.name,
        city: facility.city,
        facility_type: facility.facility_type,
        audit_type: facility.audit_type,
        audit_date: facility.audit_date,
        status: facility.status,
      },
    };
  }

  return {
    audit_type: auditType,
    facility,
    question: question.label,
    question_id: question.id,
    data,
  };
}
