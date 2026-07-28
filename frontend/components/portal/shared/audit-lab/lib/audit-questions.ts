import type { AuditTypeOption } from "@/components/portal/lib/facilityConstants";
import type { Facility } from "@/store/slices/facilityApiSlice";
import type {
  FacilityAuditEnergyUtilityNest,
  FacilityAuditSnapshotEnergyData,
  FacilityAuditSnapshotSafetyData,
} from "@/store/slices/auditApiSlice";

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
    prompt: `Report lux measurements vs required levels from the data. Calculate compliance only from recorded measured and required values. ${DATA_ONLY_RULE}`,
  },
  {
    id: "ups",
    label: "UPS Systems",
    description: "UPS capacity, loading, efficiency, and battery health indicators.",
    prompt: `Report UPS audit records as stored: capacity, loading, efficiency, battery age, room conditions. ${DATA_ONLY_RULE}`,
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
      acc.solar += nest.solar_plants?.length ?? 0;
      acc.dg += nest.dg_sets?.length ?? 0;
      acc.transformers += nest.transformers?.length ?? 0;
      acc.pumps += nest.pumps?.length ?? 0;
      acc.hvac += nest.hvac_audits?.length ?? 0;
      acc.lighting += nest.lighting_audits?.length ?? 0;
      acc.lux += nest.lux_measurements?.length ?? 0;
      acc.misc += nest.misc_load_audits?.length ?? 0;
      acc.ac += nest.ac_audit_records?.length ?? 0;
      acc.fan += nest.fan_audit_records?.length ?? 0;
      return acc;
    },
    {
      tariffs: 0,
      billing: 0,
      solar: 0,
      dg: 0,
      transformers: 0,
      pumps: 0,
      hvac: 0,
      lighting: 0,
      lux: 0,
      misc: 0,
      ac: 0,
      fan: 0,
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
      return accounts.map((n) => ({ utility_account: n.utility_account, tariffs: n.tariffs }));
    case "billing":
      return accounts.map((n) => ({ utility_account: n.utility_account, billing_records: n.billing_records }));
    case "solar":
      return accounts.map((n) => ({
        utility_account: n.utility_account,
        solar_plants: n.solar_plants?.map((sp: any) => ({
          ...sp,
          solar_generation_records: sp.solar_generation_records,
        })),
      }));
    case "dg":
      return accounts.map((n) => ({
        utility_account: n.utility_account,
        dg_sets: n.dg_sets?.map((dg: any) => ({
          ...dg,
          dg_audit_records: dg.dg_audit_records,
        })),
      }));
    case "transformer":
      return accounts.map((n) => ({
        utility_account: n.utility_account,
        transformers: n.transformers?.map((t: any) => ({
          ...t,
          transformer_audit_records: t.transformer_audit_records,
        })),
      }));
    case "pump":
      return accounts.map((n) => ({
        utility_account: n.utility_account,
        pumps: n.pumps?.map((p: any) => ({
          ...p,
          pump_audit_records: p.pump_audit_records,
        })),
      }));
    case "hvac":
      return accounts.map((n) => ({ utility_account: n.utility_account, hvac_audits: n.hvac_audits }));
    case "ac":
      return accounts.map((n) => ({ utility_account: n.utility_account, ac_audit_records: n.ac_audit_records }));
    case "lighting":
      return accounts.map((n) => ({ utility_account: n.utility_account, lighting_audits: n.lighting_audits }));
    case "lux":
      return accounts.map((n) => ({ utility_account: n.utility_account, lux_measurements: n.lux_measurements }));
    case "ups": {
      return accounts.map((n) => ({
        utility_account: n.utility_account,
        ups_audits: (n as any).ups_audits,
      }));
    }
    case "misc":
      return accounts.map((n) => ({ utility_account: n.utility_account, misc_load_audits: n.misc_load_audits }));
    case "savings":
      return {
        facility: snapshot.facility,
        record_counts: countEnergyRecords(accounts),
        utility_accounts: accounts,
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
      data: extractEnergyQuestionData(context.snapshot, question.id),
    };
  }

  if (context.auditType === "Electrical Safety Audit" && context.snapshot) {
    return {
      audit_type: context.auditType,
      facility: context.facility,
      question: question.label,
      data: extractSafetyQuestionData(context.snapshot, question.id),
    };
  }

  return {
    audit_type: context.auditType,
    facility: context.facility,
    question: question.label,
    data: buildFacilityOnlyPayload(context.facility),
  };
}

export function serializeAuditPayload(payload: unknown, maxChars = 100_000): string {
  let json = JSON.stringify(payload, null, 2);
  if (json.length <= maxChars) return json;
  return `${json.slice(0, maxChars)}\n... [truncated]`;
}
