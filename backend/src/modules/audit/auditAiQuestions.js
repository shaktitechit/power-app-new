const DATA_ONLY_RULE =
  "Use ONLY values present in the supplied JSON. Do not assume, estimate, or hypothesize. If data is missing, state that explicitly.";

export const ENERGY_QUESTIONS = [
  { id: "overview", label: "Facility Overview", prompt: `Summarize what is recorded in this electrical energy audit snapshot. ${DATA_ONLY_RULE}` },
  { id: "tariff", label: "Tariff Analysis", prompt: `Report tariff records exactly as stored. ${DATA_ONLY_RULE}` },
  { id: "billing", label: "Billing & Consumption", prompt: `Report billing records from the data. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}` },
  { id: "solar", label: "Solar Plants", prompt: `Report solar plants and generation records as stored. Include tables for equipment and every audit record row provided. ${DATA_ONLY_RULE}` },
  { id: "dg", label: "DG Sets", prompt: `Report DG sets and DG audit measurements as recorded. Include tables for equipment and every audit record row provided. ${DATA_ONLY_RULE}` },
  { id: "transformer", label: "Transformers", prompt: `Report transformers and transformer audit records as stored. Include tables for equipment and every audit record row provided. ${DATA_ONLY_RULE}` },
  { id: "pump", label: "Pumps", prompt: `Report pumps and pump audit records as stored. Include tables for equipment and every audit record row provided. ${DATA_ONLY_RULE}` },
  { id: "hvac", label: "HVAC Systems", prompt: `Report HVAC audit records as stored. ${DATA_ONLY_RULE}` },
  { id: "ac", label: "AC Systems", prompt: `Report AC audit records as stored. ${DATA_ONLY_RULE}` },
  { id: "lighting", label: "Lighting", prompt: `Report lighting audits as stored. ${DATA_ONLY_RULE}` },
  { id: "lux", label: "Lux Compliance", prompt: `Report lux measurements vs required levels. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}` },
  { id: "fan", label: "Fan Systems", prompt: `Report fan audit records as stored. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}` },
  { id: "street_light", label: "Street Lighting", prompt: `Report street light audit records as stored. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}` },
  { id: "ups", label: "UPS Systems", prompt: `Report UPS audit records as stored. Include a table with every record from audit_records/records. ${DATA_ONLY_RULE}` },
  { id: "misc", label: "Miscellaneous Loads", prompt: `Report miscellaneous load audits as stored. ${DATA_ONLY_RULE}` },
  { id: "savings", label: "Observed Inefficiencies", prompt: `List inefficiencies visible ONLY from recorded measurements. ${DATA_ONLY_RULE}` },
];

export const SAFETY_SECTION_LABELS = {
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

export function getQuestionDefinition(auditType, questionId) {
  if (auditType === "Electrical Energy Audit") {
    const q = ENERGY_QUESTIONS.find((item) => item.id === questionId);
    if (q) return q;
    return ENERGY_QUESTIONS[0];
  }
  if (auditType === "Electrical Safety Audit") {
    if (questionId === "overview") {
      return { id: "overview", label: "Safety Audit Overview", prompt: `Summarize safety audit data. ${DATA_ONLY_RULE}` };
    }
    const label = SAFETY_SECTION_LABELS[questionId];
    if (label) {
      return {
        id: questionId,
        label,
        prompt: `Report ${label} safety checklist records exactly as stored. ${DATA_ONLY_RULE}`,
      };
    }
  }
  if (questionId === "facility_profile") {
    return {
      id: "facility_profile",
      label: "Facility Profile",
      prompt: `Report only facility profile fields present in the JSON. ${DATA_ONLY_RULE}`,
    };
  }
  return { id: questionId, label: questionId, prompt: DATA_ONLY_RULE };
}

export const AUDIT_AI_SYSTEM_PROMPT = `You are Shakti AI, an expert electrical audit analyst for the Power Audit application.

CRITICAL RULES — YOU MUST FOLLOW:
1. Answer ONLY using values explicitly present in the supplied audit JSON.
2. If a field is missing, state "Not available in audit data".
3. Every finding and metric MUST come directly from the JSON.
4. If stats.truncated is true, mention analysis covers included_count of record_count rows only.
5. When tables are requested or audit_records/records are present, the tables.rows array MUST include one row per included record (do not sample or omit rows that are in the JSON).
6. Use stats.included_count as the number of table rows when audit_records/records are provided.

Respond ONLY with valid JSON (no markdown fences):
{
  "summary": "",
  "data_availability": "",
  "findings": [{ "title": "", "detail": "", "severity": "high|medium|low|info", "data_reference": "" }],
  "recommendations": [],
  "metrics": [{ "label": "", "value": "", "data_reference": "" }],
  "tables": [{ "title": "", "columns": [], "rows": [] }],
  "charts": [{ "title": "", "type": "bar|line|pie", "xKey": "", "data": [], "series": [] }]
}`;
