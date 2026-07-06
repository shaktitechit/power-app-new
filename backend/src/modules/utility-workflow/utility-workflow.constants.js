/** @typedef {"pending" | "completed"} AccountStatus */
/** @typedef {"pending" | "completed"} SectionStatus */

export const ACCOUNT_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
};

export const SECTION_STATUS = {
  PENDING: "pending",
  COMPLETED: "completed",
};

export const FINAL_SUBMIT_STEPS = [
  "preview-and-submit",
  "safety-preview-and-submit",
];

export const ALLOWED_AUDIT_STEPS = [
  "tarrif",
  "utility-billing-records",
  "solar-plants",
  "dg-sets",
  "transformer",
  "pump",
  "hvac",
  "ac",
  "lighting",
  "street-light",
  "fan",
  "lux",
  "ups",
  "misc",
  "transformers",
  "metering-room",
  "panel-room",
  "light-db",
  "dg-set",
  "earthing-system",
  "ups-battery",
  "general-safety",
  "wiring-inspection",
  "load-analysis",
  "leak-inspection",
  "thermography",
  "elevator-safety",
  "pac-ventilation",
  "pump-compressor",
  "additional-items",
  "documents-review",
  ...FINAL_SUBMIT_STEPS,
];

/** Energy & Safety audit API step id -> dataSheet key */
export const AUDIT_STEP_TO_DATASHEET_KEY = {
  tarrif: "tariff",
  "utility-billing-records": "billing",
  "solar-plants": "solar",
  "dg-sets": "dg",
  transformer: "transformer",
  pump: "pump",
  hvac: "hvac",
  ac: "ac",
  lighting: "lighting",
  "street-light": "street-light",
  fan: "fan",
  lux: "lux",
  ups: "ups",
  misc: "misc",
  transformers: "transformers",
  "metering-room": "metering-room",
  "panel-room": "panel-room",
  "light-db": "light-db",
  "dg-set": "dg-set",
  "earthing-system": "earthing-system",
  "ups-battery": "ups-battery",
  "general-safety": "general-safety",
  "wiring-inspection": "wiring-inspection",
  "load-analysis": "load-analysis",
  "leak-inspection": "leak-inspection",
  thermography: "thermography",
  "elevator-safety": "elevator-safety",
  "pac-ventilation": "pac-ventilation",
  "pump-compressor": "pump-compressor",
  "additional-items": "additional-items",
  "documents-review": "documents-review",
};

export const DATASHEET_KEY_TO_AUDIT_STEP = Object.fromEntries(
  Object.entries(AUDIT_STEP_TO_DATASHEET_KEY).map(([step, key]) => [key, step]),
);

export const CONNECTED_DATASHEET_KEYS = ["solar", "dg", "transformer", "pump"];

export const LOAD_AUDIT_DATASHEET_KEYS = [
  "hvac",
  "ac",
  "lighting",
  "street-light",
  "fan",
  "lux",
  "ups",
  "misc",
];

export const SAFETY_DATASHEET_KEYS = [
  "transformers",
  "metering-room",
  "panel-room",
  "light-db",
  "dg-set",
  "earthing-system",
  "ups-battery",
  "general-safety",
  "wiring-inspection",
  "load-analysis",
  "leak-inspection",
  "thermography",
  "elevator-safety",
  "pac-ventilation",
  "pump-compressor",
  "additional-items",
  "documents-review",
];

export const STANDARD_DATASHEET_KEYS = [
  "tariff",
  "billing",
  ...LOAD_AUDIT_DATASHEET_KEYS,
  ...SAFETY_DATASHEET_KEYS,
];

export const ALL_ENERGY_DATASHEET_KEYS = [
  ...CONNECTED_DATASHEET_KEYS,
  "tariff",
  "billing",
  ...LOAD_AUDIT_DATASHEET_KEYS,
  ...SAFETY_DATASHEET_KEYS,
];

export const CONNECTION_FLAG_BY_KEY = {
  solar: "is_solar_connected",
  dg: "is_dg_connected",
  transformer: "is_transformer_connected",
  pump: "is_pump_connected",
};

/** @deprecated Legacy top-level flags removed from model; use dataSheet.*.connected */
export const LEGACY_CONNECTION_FLAG_BY_KEY = CONNECTION_FLAG_BY_KEY;


export const isAllowedAuditStep = (step) =>
  typeof step === "string" && ALLOWED_AUDIT_STEPS.includes(step);

export const isFinalSubmitStep = (step) =>
  typeof step === "string" && FINAL_SUBMIT_STEPS.includes(step);

export const getDataSheetKeyForAuditStep = (step) =>
  AUDIT_STEP_TO_DATASHEET_KEY[step] || null;

export const isEnergyAuditStep = (step) =>
  Boolean(getDataSheetKeyForAuditStep(step));
