import type { AuditTypeOption } from "@/components/portal/lib/facilityConstants";
import type { Facility } from "@/store/slices/facilityApiSlice";
import type {
  FacilityAuditEnergyUtilityNest,
  FacilityAuditSnapshotEnergyData,
  FacilityAuditSnapshotSafetyData,
} from "@/store/slices/auditApiSlice";
import {
  countNestedAuditRecords,
  extractEquipmentWithAuditRecords,
  extractFlatRecords,
} from "./energy-snapshot-extractors";

export interface AuditQuestionDefinition {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

const DATA_ONLY_RULE =
  "Use ONLY values present in the supplied JSON. Do not assume, estimate, or hypothesize. If data is missing, state that explicitly.";

const ENERGY_QUESTIONS: AuditQuestionDefinition[] = [
  {
    id: "overview",
    label: "Facility Overview",
    description: "Record counts and connected sections from the snapshot.",
    prompt: `Summarize what is recorded in this electrical energy audit snapshot: utility accounts, connected sections, and record counts per section. ${DATA_ONLY_RULE}`,
  },
  {
    id: "tariff",
    label: "Tariff Analysis",
    description: "Utility tariff structures, charges, and effective periods.",
    prompt: `Report tariff records exactly as stored: effective dates, charge components, and values. Include a table if multiple tariffs exist. ${DATA_ONLY_RULE}`,
  },
  {
    id: "billing",
    label: "Billing & Consumption",
    description: "Monthly bills, kWh/kVAh, MDI, power factor, and grid costs.",
    prompt: `Report billing records from the data: consumption, demand, power factor, penalties, and costs. Use a table for monthly rows and a line/bar chart if multiple months exist. ${DATA_ONLY_RULE}`,
  },
  {
    id: "solar",
    label: "Solar Plants",
    description: "Solar plant configuration and generation performance.",
    prompt: `Report solar plants and generation records as stored: capacity, generation, import/export values. ${DATA_ONLY_RULE}`,
  },
  {
    id: "dg",
    label: "DG Sets",
    description: "DG configuration, audit records, loading, and fuel efficiency.",
    prompt: `Report DG sets and DG audit measurements as recorded: capacity, output, loading, SFC, efficiency. ${DATA_ONLY_RULE}`,
  },
  {
    id: "transformer",
    label: "Transformers",
    description: "Transformer assets, losses, and audit measurements.",
    prompt: `Report transformers and transformer audit records as stored: capacity, loading, losses, power factor. ${DATA_ONLY_RULE}`,
  },
  {
    id: "pump",
    label: "Pumps",
    description: "Pump systems, flow, SEC, and audit measurements.",
    prompt: `Report pumps and pump audit records as stored: flow, SEC, motor loading, energy use. ${DATA_ONLY_RULE}`,
  },
  {
    id: "hvac",
    label: "HVAC Systems",
    description: "Chiller plant efficiency, COP, and cooling load.",
    prompt: `Report HVAC audit records as stored: cooling produced, plant power, efficiency, COP. ${DATA_ONLY_RULE}`,
  },
  {
    id: "ac",
    label: "AC Systems",
    description: "Air conditioning loads and specific power consumption.",
    prompt: `Report AC audit records as stored: connected load, specific power, annual energy. ${DATA_ONLY_RULE}`,
  },
  {
    id: "lighting",
    label: "Lighting",
    description: "Lighting inventory, wattage, and annual energy.",
    prompt: `Report lighting audits as stored: fixture counts, wattage, connected load, annual energy. ${DATA_ONLY_RULE}`,
  },
  {
    id: "lux",
    label: "Lux Compliance",
    description: "Illuminance measurements vs required lux levels.",
    prompt: `Report lux measurements vs required levels from the data. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}`,
  },
  {
    id: "fan",
    label: "Fan Systems",
    description: "Fan inventory, loads, and audit measurements.",
    prompt: `Report fan audit records as stored. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}`,
  },
  {
    id: "street_light",
    label: "Street Lighting",
    description: "Street light fixtures, wattage, and connected load.",
    prompt: `Report street light audit records as stored. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}`,
  },
  {
    id: "ups",
    label: "UPS Systems",
    description: "UPS capacity, loading, efficiency, and battery health indicators.",
    prompt: `Report UPS audit records as stored. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}`,
  },
  {
    id: "misc",
    label: "Miscellaneous Loads",
    description: "Other equipment loads and load factors.",
    prompt: `Report miscellaneous load audits as stored: equipment, load factors, energy consumption. ${DATA_ONLY_RULE}`,
  },
  {
    id: "savings",
    label: "Observed Inefficiencies",
    description: "Issues visible from recorded measurements only.",
    prompt: `List inefficiencies or anomalies visible ONLY from recorded measurements across sections. Do not estimate savings or impacts not present in the data. ${DATA_ONLY_RULE}`,
  },
];

const SAFETY_SECTION_LABELS: Record<string, string> = {
  safety_general: "General Safety",
  safety_documents: "Documents Review",
  safety_earthing: "Earthing System",
  safety_panel_room: "Panel Room",
  safety_metering_room: "Metering Room",
  safety_ldb: "LDB / Distribution Boards",
  safety_transformer: "Transformer Safety",
  safety_dg: "DG Safety",
  safety_ups: "UPS Safety",
  safety_wiring: "Wiring Inspection",
  safety_load_analysis: "Load Analysis",
  safety_leak_inspection: "Leak Inspection",
  safety_thermography: "Thermography",
  safety_pump_compressor: "Pump & Compressor",
  safety_elevator: "Elevator Safety",
  safety_pac_ventilation: "PAC & Ventilation",
  safety_additional_items: "Additional Items",
};

const SAFETY_QUESTIONS: AuditQuestionDefinition[] = [
  {
    id: "overview",
    label: "Safety Audit Overview",
    description: "Summary across all safety checklist sections.",
    prompt: `Summarize safety audit data: section coverage and record counts from the JSON. ${DATA_ONLY_RULE}`,
  },
  ...Object.entries(SAFETY_SECTION_LABELS).map(([id, label]) => ({
    id,
    label,
    description: `Recorded ${label.toLowerCase()} checklist items.`,
    prompt: `Report ${label} safety checklist records exactly as stored. Include a table of items, status/observations, and non-compliance only where recorded. ${DATA_ONLY_RULE}`,
  })),
];

const THERMAL_QUESTIONS: AuditQuestionDefinition[] = [
  {
    id: "facility_profile",
    label: "Facility Profile",
    description: "Facility fields available in the system.",
    prompt: `Report only the facility profile fields present in the JSON (name, type, location, audit date, status). ${DATA_ONLY_RULE}`,
  },
];

const LIGHTNING_QUESTIONS: AuditQuestionDefinition[] = [
  {
    id: "facility_profile",
    label: "Facility Profile",
    description: "Facility fields available in the system.",
    prompt: `Report only the facility profile fields present in the JSON (name, type, location, audit date, status). ${DATA_ONLY_RULE}`,
  },
];

export function getQuestionsForAuditType(auditType: AuditTypeOption): AuditQuestionDefinition[] {
  switch (auditType) {
    case "Electrical Energy Audit":
      return ENERGY_QUESTIONS;
    case "Electrical Safety Audit":
      return SAFETY_QUESTIONS;
    case "Thermal Audit":
      return THERMAL_QUESTIONS;
    case "Lightning Arrester Audit":
      return LIGHTNING_QUESTIONS;
    default:
      return [];
  }
}

export type LoadedAuditContext =
  | { auditType: "Electrical Energy Audit"; facility: Facility; snapshot: FacilityAuditSnapshotEnergyData }
  | { auditType: "Electrical Safety Audit"; facility: Facility; snapshot: FacilityAuditSnapshotSafetyData }
  | { auditType: "Thermal Audit" | "Lightning Arrester Audit"; facility: Facility; snapshot: null };

function countEnergyRecords(accounts: FacilityAuditEnergyUtilityNest[]) {
  return accounts.reduce(
    (acc, nest) => {
      acc.tariffs += nest.tariffs?.length ?? 0;
      acc.billing += nest.billing_records?.length ?? 0;
      acc.solar_plants += nest.solar_plants?.length ?? 0;
      acc.solar_generation_records += countNestedAuditRecords(
        [nest],
        "solar_generation_records",
        "solar_plants",
      );
      acc.dg_sets += nest.dg_sets?.length ?? 0;
      acc.dg_audit_records += countNestedAuditRecords([nest], "dg_audit_records", "dg_sets");
      acc.transformers += nest.transformers?.length ?? 0;
      acc.transformer_audit_records += countNestedAuditRecords(
        [nest],
        "transformer_audit_records",
        "transformers",
      );
      acc.pumps += nest.pumps?.length ?? 0;
      acc.pump_audit_records += countNestedAuditRecords(
        [nest],
        "pump_audit_records",
        "pumps",
      );
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

function extractEnergyQuestionData(
  snapshot: FacilityAuditSnapshotEnergyData,
  questionId: string,
): unknown {
  const accounts = snapshot.utility_accounts ?? [];

  switch (questionId) {
    case "overview":
      return {
        facility: snapshot.facility,
        utility_account_count: accounts.length,
        record_counts: countEnergyRecords(accounts),
        utility_accounts: accounts.map((nest) => ({
          utility_account: nest.utility_account,
          connected_sections: (nest.utility_account as { dataSheet?: Record<string, { connected?: boolean }> })
            ?.dataSheet,
          counts: countEnergyRecords([nest]),
        })),
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

function extractSafetyQuestionData(
  snapshot: FacilityAuditSnapshotSafetyData,
  questionId: string,
): unknown {
  const accounts = snapshot.utility_accounts ?? [];

  if (questionId === "overview") {
    const sectionCounts: Record<string, number> = {};
    for (const nest of accounts) {
      const sections = nest.safety_sections ?? {};
      for (const [key, rows] of Object.entries(sections)) {
        sectionCounts[key] = (sectionCounts[key] ?? 0) + (Array.isArray(rows) ? rows.length : 0);
      }
    }
    return { facility: snapshot.facility, utility_account_count: accounts.length, section_counts: sectionCounts, utility_accounts: accounts };
  }

  return accounts.map((nest) => ({
    utility_account: nest.utility_account,
    section: questionId,
    records: nest.safety_sections?.[questionId] ?? [],
  }));
}

function buildFacilityOnlyPayload(facility: Facility) {
  return {
    facility: {
      _id: facility._id,
      name: facility.name,
      city: facility.city,
      address: facility.address,
      facility_type: facility.facility_type,
      audit_type: facility.audit_type,
      audit_date: facility.audit_date,
      status: facility.status,
      audit_closure: facility.audit_closure,
      documents: facility.documents,
    },
    note: "Full audit snapshot API is not available for this program yet. Analysis uses facility profile data.",
  };
}

export function extractQuestionPayload(
  context: LoadedAuditContext,
  question: AuditQuestionDefinition,
): unknown {
  if (context.auditType === "Electrical Energy Audit" && context.snapshot) {
    return {
      audit_type: context.auditType,
      facility: context.facility,
      question: question.label,
      question_id: question.id,
      data: extractEnergyQuestionData(context.snapshot, question.id),
    };
  }

  if (context.auditType === "Electrical Safety Audit" && context.snapshot) {
    return {
      audit_type: context.auditType,
      facility: context.facility,
      question: question.label,
      question_id: question.id,
      data: extractSafetyQuestionData(context.snapshot, question.id),
    };
  }

  return {
    audit_type: context.auditType,
    facility: context.facility,
    question: question.label,
    question_id: question.id,
    data: buildFacilityOnlyPayload(context.facility),
  };
}
