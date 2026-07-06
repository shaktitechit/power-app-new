import type { LucideIcon } from "lucide-react";
import {
  AirVent,
  Cpu,
  Droplet,
  Fan,
  FileText,
  Gauge,
  Layers,
  Lightbulb,
  Receipt,
  Snowflake,
  Sun,
  Zap,
  Activity,
  AlertCircle,
  Battery,
  BarChart3,
  Shield,
  ShieldAlert,
  Thermometer,
  ArrowUpDown,
  Key,
} from "lucide-react";
import type { UtilityAccountDataSheet } from "@/store/slices/electrical-audit/utilityApiSlice";

export const CONNECTED_DATASHEET_SECTIONS = [
  {
    key: "solar",
    label: "Solar Plants",
    description: "On-site solar generation connected to this account",
  },
  {
    key: "dg",
    label: "DG Sets",
    description: "Diesel generator sets connected to this account",
  },
  {
    key: "transformer",
    label: "Transformer",
    description: "Dedicated transformer serving this account",
  },
  {
    key: "pump",
    label: "Pump",
    description: "Pump load connected to this account",
  },
] as const;

export const STANDARD_DATASHEET_SECTIONS = [
  { key: "tariff", label: "Tariff", description: "Tariff structure and rates audit" },
  { key: "billing", label: "Billing", description: "Utility billing records audit" },
  { key: "hvac", label: "HVAC", description: "HVAC load audit" },
  { key: "ac", label: "AC", description: "Air conditioning load audit" },
  { key: "lighting", label: "Lighting", description: "Lighting load audit" },
  { key: "street-light", label: "Street Light", description: "Street lighting load audit" },
  { key: "fan", label: "Fan", description: "Fan load audit" },
  { key: "lux", label: "Lux", description: "Lux level measurements" },
  { key: "ups", label: "UPS", description: "UPS system energy audit" },
  { key: "misc", label: "Misc", description: "Miscellaneous load audit" },
  { key: "transformers", label: "Transformers", description: "Transformers checklist" },
  { key: "metering-room", label: "Metering Room", description: "Metering room checklist" },
  { key: "panel-room", label: "Panel Room", description: "Panel room checklist" },
  { key: "light-db", label: "Light DB", description: "Light DB checklist" },
  { key: "dg-set", label: "DG Set", description: "DG Set checklist" },
  { key: "earthing-system", label: "Earthing System", description: "Earthing system checklist" },
  { key: "ups-battery", label: "UPS & Battery", description: "UPS & Battery checklist" },
  { key: "general-safety", label: "General Safety", description: "General safety checklist" },
  { key: "wiring-inspection", label: "Wiring Inspection", description: "Wiring inspection checklist" },
  { key: "load-analysis", label: "Load Analysis", description: "Load analysis checklist" },
  { key: "leak-inspection", label: "Leak Inspection", description: "Leak inspection checklist" },
  { key: "thermography", label: "Thermography", description: "Thermography checklist" },
  { key: "elevator-safety", label: "Elevator Safety", description: "Elevator safety checklist" },
  { key: "pac-ventilation", label: "PAC & Ventilation", description: "PAC & Ventilation checklist" },
  { key: "pump-compressor", label: "Pump / Compressor", description: "Pump / Compressor checklist" },
  { key: "additional-items", label: "Additional Items", description: "Additional items checklist" },
  { key: "documents-review", label: "Documents Review", description: "Documents review checklist" },
] as const;

export type ConnectedDataSheetKey =
  (typeof CONNECTED_DATASHEET_SECTIONS)[number]["key"];

export type StandardDataSheetKey =
  (typeof STANDARD_DATASHEET_SECTIONS)[number]["key"];

export type DataSheetKey = ConnectedDataSheetKey | StandardDataSheetKey;

export type DataSheetInclusions = Record<DataSheetKey, boolean>;

export const ALL_DATASHEET_SECTIONS = [
  ...CONNECTED_DATASHEET_SECTIONS,
  ...STANDARD_DATASHEET_SECTIONS,
] as const;

export const DEFAULT_DATASHEET_INCLUSIONS: DataSheetInclusions = {
  solar: true,
  dg: true,
  transformer: true,
  pump: true,
  tariff: true,
  billing: true,
  hvac: true,
  ac: true,
  lighting: true,
  "street-light": true,
  fan: true,
  lux: true,
  ups: true,
  misc: true,
  transformers: false,
  "metering-room": false,
  "panel-room": false,
  "light-db": false,
  "dg-set": false,
  "earthing-system": false,
  "ups-battery": false,
  "general-safety": false,
  "wiring-inspection": false,
  "load-analysis": false,
  "leak-inspection": false,
  thermography: false,
  "elevator-safety": false,
  "pac-ventilation": false,
  "pump-compressor": false,
  "additional-items": false,
  "documents-review": false,
};

export const DEFAULT_SAFETY_DATASHEET_INCLUSIONS: DataSheetInclusions = {
  solar: false,
  dg: false,
  transformer: false,
  pump: false,
  tariff: false,
  billing: false,
  hvac: false,
  ac: false,
  lighting: false,
  "street-light": false,
  fan: false,
  lux: false,
  ups: false,
  misc: false,
  transformers: true,
  "metering-room": true,
  "panel-room": true,
  "light-db": true,
  "dg-set": true,
  "earthing-system": true,
  "ups-battery": true,
  "general-safety": true,
  "wiring-inspection": true,
  "load-analysis": true,
  "leak-inspection": true,
  thermography: true,
  "elevator-safety": true,
  "pac-ventilation": true,
  "pump-compressor": true,
  "additional-items": true,
  "documents-review": true,
};

/** @deprecated Use DEFAULT_DATASHEET_INCLUSIONS */
export const DEFAULT_CONNECTED_FLAGS = {
  solar: DEFAULT_DATASHEET_INCLUSIONS.solar,
  dg: DEFAULT_DATASHEET_INCLUSIONS.dg,
  transformer: DEFAULT_DATASHEET_INCLUSIONS.transformer,
  pump: DEFAULT_DATASHEET_INCLUSIONS.pump,
};

/** @deprecated Use DEFAULT_DATASHEET_INCLUSIONS */
export const DEFAULT_STANDARD_FLAGS = {
  tariff: DEFAULT_DATASHEET_INCLUSIONS.tariff,
  billing: DEFAULT_DATASHEET_INCLUSIONS.billing,
  hvac: DEFAULT_DATASHEET_INCLUSIONS.hvac,
  ac: DEFAULT_DATASHEET_INCLUSIONS.ac,
  lighting: DEFAULT_DATASHEET_INCLUSIONS.lighting,
  fan: DEFAULT_DATASHEET_INCLUSIONS.fan,
  lux: DEFAULT_DATASHEET_INCLUSIONS.lux,
  misc: DEFAULT_DATASHEET_INCLUSIONS.misc,
};

export type DataSheetSectionDisplay = {
  key: DataSheetKey;
  label: string;
  icon: LucideIcon;
  activeClass: string;
};

export const DATASHEET_SECTION_DISPLAY: DataSheetSectionDisplay[] = [
  {
    key: "dg",
    label: "DG Sets",
    icon: Zap,
    activeClass:
      "border-orange-500/20 bg-orange-500/10 text-orange-500 dark:bg-orange-500/20",
  },
  {
    key: "solar",
    label: "Solar Plants",
    icon: Sun,
    activeClass:
      "border-amber-500/20 bg-amber-500/10 text-amber-500 dark:bg-amber-500/20",
  },
  {
    key: "transformer",
    label: "Transformer",
    icon: Cpu,
    activeClass:
      "border-blue-500/20 bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
  },
  {
    key: "pump",
    label: "Pump",
    icon: Droplet,
    activeClass:
      "border-sky-500/20 bg-sky-500/10 text-sky-500 dark:bg-sky-500/20",
  },
  {
    key: "tariff",
    label: "Tariff",
    icon: Receipt,
    activeClass:
      "border-violet-500/20 bg-violet-500/10 text-violet-500 dark:bg-violet-500/20",
  },
  {
    key: "billing",
    label: "Billing",
    icon: FileText,
    activeClass:
      "border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20",
  },
  {
    key: "hvac",
    label: "HVAC",
    icon: AirVent,
    activeClass:
      "border-teal-500/20 bg-teal-500/10 text-teal-500 dark:bg-teal-500/20",
  },
  {
    key: "ac",
    label: "AC",
    icon: Snowflake,
    activeClass:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20",
  },
  {
    key: "lighting",
    label: "Lighting",
    icon: Lightbulb,
    activeClass:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20",
  },
  {
    key: "street-light",
    label: "Street Light",
    icon: Lightbulb,
    activeClass:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20",
  },
  {
    key: "fan",
    label: "Fan",
    icon: Fan,
    activeClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20",
  },
  {
    key: "lux",
    label: "Lux",
    icon: Gauge,
    activeClass:
      "border-lime-500/20 bg-lime-500/10 text-lime-600 dark:bg-lime-500/20",
  },
  {
    key: "ups",
    label: "UPS",
    icon: Battery,
    activeClass:
      "border-green-500/20 bg-green-500/10 text-green-600 dark:bg-green-500/20",
  },
  {
    key: "misc",
    label: "Misc",
    icon: Layers,
    activeClass:
      "border-rose-500/20 bg-rose-500/10 text-rose-500 dark:bg-rose-500/20",
  },
  {
    key: "transformers",
    label: "Transformers",
    icon: Cpu,
    activeClass:
      "border-blue-500/20 bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
  },
  {
    key: "metering-room",
    label: "Metering Room",
    icon: Key,
    activeClass:
      "border-purple-500/20 bg-purple-500/10 text-purple-500 dark:bg-purple-500/20",
  },
  {
    key: "panel-room",
    label: "Panel Room",
    icon: Layers,
    activeClass:
      "border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:bg-indigo-500/20",
  },
  {
    key: "light-db",
    label: "Light DB",
    icon: Lightbulb,
    activeClass:
      "border-yellow-500/20 bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20",
  },
  {
    key: "dg-set",
    label: "DG Set",
    icon: Zap,
    activeClass:
      "border-orange-500/20 bg-orange-500/10 text-orange-500 dark:bg-orange-500/20",
  },
  {
    key: "earthing-system",
    label: "Earthing System",
    icon: Shield,
    activeClass:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20",
  },
  {
    key: "ups-battery",
    label: "UPS & Battery",
    icon: Battery,
    activeClass:
      "border-teal-500/20 bg-teal-500/10 text-teal-500 dark:bg-teal-500/20",
  },
  {
    key: "general-safety",
    label: "General Safety",
    icon: ShieldAlert,
    activeClass:
      "border-red-500/20 bg-red-500/10 text-red-500 dark:bg-red-500/20",
  },
  {
    key: "wiring-inspection",
    label: "Wiring Inspection",
    icon: Activity,
    activeClass:
      "border-sky-500/20 bg-sky-500/10 text-sky-500 dark:bg-sky-500/20",
  },
  {
    key: "load-analysis",
    label: "Load Analysis",
    icon: BarChart3,
    activeClass:
      "border-pink-500/20 bg-pink-500/10 text-pink-500 dark:bg-pink-500/20",
  },
  {
    key: "leak-inspection",
    label: "Leak Inspection",
    icon: Droplet,
    activeClass:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-500 dark:bg-cyan-500/20",
  },
  {
    key: "thermography",
    label: "Thermography",
    icon: Thermometer,
    activeClass:
      "border-rose-500/20 bg-rose-500/10 text-rose-500 dark:bg-rose-500/20",
  },
  {
    key: "elevator-safety",
    label: "Elevator Safety",
    icon: ArrowUpDown,
    activeClass:
      "border-amber-500/20 bg-amber-500/10 text-amber-500 dark:bg-amber-500/20",
  },
  {
    key: "pac-ventilation",
    label: "PAC & Ventilation",
    icon: AirVent,
    activeClass:
      "border-violet-500/20 bg-violet-500/10 text-violet-500 dark:bg-violet-500/20",
  },
  {
    key: "pump-compressor",
    label: "Pump / Compressor",
    icon: Fan,
    activeClass:
      "border-lime-500/20 bg-lime-500/10 text-lime-500 dark:bg-lime-500/20",
  },
  {
    key: "additional-items",
    label: "Additional Items",
    icon: AlertCircle,
    activeClass:
      "border-slate-500/20 bg-slate-500/10 text-slate-500 dark:bg-slate-500/20",
  },
  {
    key: "documents-review",
    label: "Documents Review",
    icon: FileText,
    activeClass:
      "border-neutral-500/20 bg-neutral-500/10 text-neutral-500 dark:bg-neutral-500/20",
  },
];

export const isDataSheetSectionIncluded = (
  dataSheet: UtilityAccountDataSheet | undefined | null,
  key: DataSheetKey,
): boolean => {
  const section = dataSheet?.[key];
  if (!section || typeof section !== "object") return false;
  return section.connected === true;
};

export const filterIncludedDataSheetSections = (
  dataSheet: UtilityAccountDataSheet | undefined | null,
): DataSheetSectionDisplay[] =>
  DATASHEET_SECTION_DISPLAY.filter((section) =>
    isDataSheetSectionIncluded(dataSheet, section.key),
  );

export const getDataSheetInclusionsFromAccount = (utilityAccount: {
  dataSheet?: UtilityAccountDataSheet;
}): DataSheetInclusions => {
  const flags = {} as DataSheetInclusions;

  for (const section of ALL_DATASHEET_SECTIONS) {
    flags[section.key] =
      utilityAccount.dataSheet?.[section.key]?.connected === true;
  }

  return flags;
};

/** @deprecated Use getDataSheetInclusionsFromAccount */
export const getConnectedFlagsFromUtilityAccount = getDataSheetInclusionsFromAccount;

/** @deprecated Use getDataSheetInclusionsFromAccount */
export const getStandardFlagsFromUtilityAccount = (
  utilityAccount: { dataSheet?: UtilityAccountDataSheet },
): DataSheetInclusions => getDataSheetInclusionsFromAccount(utilityAccount);

export const ENERGY_KEYS = [
  "solar",
  "dg",
  "transformer",
  "pump",
  "tariff",
  "billing",
  "hvac",
  "ac",
  "lighting",
  "street-light",
  "fan",
  "lux",
  "ups",
  "misc",
] as const;

export const SAFETY_KEYS = [
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
] as const;

export const ENERGY_SECTIONS = ALL_DATASHEET_SECTIONS.filter((section) =>
  (ENERGY_KEYS as readonly string[]).includes(section.key)
);

export const SAFETY_SECTIONS = ALL_DATASHEET_SECTIONS.filter((section) =>
  (SAFETY_KEYS as readonly string[]).includes(section.key)
);

