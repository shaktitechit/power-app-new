import {
  CONNECTED_DATASHEET_KEYS,
  SECTION_STATUS,
  STANDARD_DATASHEET_KEYS,
  ALL_ENERGY_DATASHEET_KEYS,
} from "./utility-workflow.constants.js";

const defaultSection = (connected = false) => {
  const isConnected = Boolean(connected);
  return {
    connected: isConnected,
    status: isConnected ? SECTION_STATUS.PENDING : SECTION_STATUS.COMPLETED,
    completed_at: isConnected ? null : new Date(),
    completed_by: null,
  };
};

const defaultConnectedSection = (connected = false) => {
  const isConnected = Boolean(connected);
  return {
    connected: isConnected,
    status: isConnected ? SECTION_STATUS.PENDING : SECTION_STATUS.COMPLETED,
    completed_at: isConnected ? null : new Date(),
    completed_by: null,
  };
};

const resolveInclusion = (inclusions, key, defaultValue = false) =>
  inclusions?.[key] !== undefined ? Boolean(inclusions[key]) : defaultValue;

export const DATASHEET_ALL_FALSE_INCLUSIONS = Object.fromEntries(
  ALL_ENERGY_DATASHEET_KEYS.map((key) => [key, false]),
);

export const buildDefaultDataSheet = (inclusions = {}) => ({
  solar: defaultConnectedSection(resolveInclusion(inclusions, "solar")),
  dg: defaultConnectedSection(resolveInclusion(inclusions, "dg")),
  transformer: defaultConnectedSection(resolveInclusion(inclusions, "transformer")),
  pump: defaultConnectedSection(resolveInclusion(inclusions, "pump")),
  tariff: defaultSection(resolveInclusion(inclusions, "tariff")),
  billing: defaultSection(resolveInclusion(inclusions, "billing")),
  hvac: defaultSection(resolveInclusion(inclusions, "hvac")),
  ac: defaultSection(resolveInclusion(inclusions, "ac")),
  lighting: defaultSection(resolveInclusion(inclusions, "lighting")),
  "street-light": defaultSection(resolveInclusion(inclusions, "street-light")),
  fan: defaultSection(resolveInclusion(inclusions, "fan")),
  lux: defaultSection(resolveInclusion(inclusions, "lux")),
  ups: defaultSection(resolveInclusion(inclusions, "ups")),
  misc: defaultSection(resolveInclusion(inclusions, "misc")),
  transformers: defaultSection(resolveInclusion(inclusions, "transformers", true)),
  "metering-room": defaultSection(resolveInclusion(inclusions, "metering-room", true)),
  "panel-room": defaultSection(resolveInclusion(inclusions, "panel-room", true)),
  "light-db": defaultSection(resolveInclusion(inclusions, "light-db", true)),
  "dg-set": defaultSection(resolveInclusion(inclusions, "dg-set", true)),
  "earthing-system": defaultSection(resolveInclusion(inclusions, "earthing-system", true)),
  "ups-battery": defaultSection(resolveInclusion(inclusions, "ups-battery", true)),
  "general-safety": defaultSection(resolveInclusion(inclusions, "general-safety", true)),
  "wiring-inspection": defaultSection(resolveInclusion(inclusions, "wiring-inspection", true)),
  "load-analysis": defaultSection(resolveInclusion(inclusions, "load-analysis", true)),
  "leak-inspection": defaultSection(resolveInclusion(inclusions, "leak-inspection", true)),
  thermography: defaultSection(resolveInclusion(inclusions, "thermography", true)),
  "elevator-safety": defaultSection(resolveInclusion(inclusions, "elevator-safety", true)),
  "pac-ventilation": defaultSection(resolveInclusion(inclusions, "pac-ventilation", true)),
  "pump-compressor": defaultSection(resolveInclusion(inclusions, "pump-compressor", true)),
  "additional-items": defaultSection(resolveInclusion(inclusions, "additional-items", true)),
  "documents-review": defaultSection(resolveInclusion(inclusions, "documents-review", true)),
});

export {
  defaultSection,
  defaultConnectedSection,
  CONNECTED_DATASHEET_KEYS,
  STANDARD_DATASHEET_KEYS,
  ALL_ENERGY_DATASHEET_KEYS,
};
