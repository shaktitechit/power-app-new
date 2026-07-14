import {
  AUDIT_STEP_TO_DATASHEET_KEY,
  UTILITY_AUDIT_STEP_IDS,
  UTILITY_AUDIT_STEP_LABELS,
} from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { getPreviewFieldLabel } from "@/components/portal/lib/electrical-audit/utility-audit-preview-field-labels";
import type { EnergyAuditRecordCompletionContext } from "@/components/portal/lib/electrical-audit/utility-audit-section-completion";
import {
  cellPreview,
  isIdLikeFieldKey,
  isPlainObject,
  NESTED_AUDIT_RECORD_KEYS,
} from "@/components/portal/lib/audit-snapshot-table-utils";
import type {
  SheetColumn,
  SheetRow,
} from "@/components/portal/shared/components/google-sheet-grid";

export type UtilityAuditPreviewRecordMeta = {
  id: string;
  isCompleted: boolean;
};

export type UtilityAuditPreviewSheetSection = {
  id: string;
  title: string;
  columns: SheetColumn[];
  rows: SheetRow[];
  recordMeta?: UtilityAuditPreviewRecordMeta[];
  supportsCompletenessToggle?: boolean;
};

export type UtilityAuditPreviewSheetTab = {
  stepId: string;
  sheetKey: string;
  label: string;
  sections: UtilityAuditPreviewSheetSection[];
  rowCount: number;
};

type LooseRecord = Record<string, unknown>;

const OMIT_FLATTEN_KEYS = new Set([
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
  "facility",
  "auditor_id",
]);

const PRIORITY_COLUMN_KEYS = [
  "is_completed",
  "audit_date",
  "solar_plant",
  "dg_set",
  "transformer",
  "pump",
  "plant_name",
  "dg_number",
  "transformer_tag",
  "pump_tag_number",
  "bill_no",
  "account_number",
  "billing_period_start",
  "billing_period_end",
  "effective_from",
  "effective_to",
];

function resolveEntityId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id?: string })._id ?? "");
  }
  return String(value);
}

function shouldOmitFlattenKey(key: string): boolean {
  if (OMIT_FLATTEN_KEYS.has(key)) return true;
  if (isIdLikeFieldKey(key)) return true;
  if (NESTED_AUDIT_RECORD_KEYS.has(key)) return true;
  return false;
}

function shouldIncludeColumnKey(key: string): boolean {
  const leaf = key.split(".").pop() ?? key;
  if (isIdLikeFieldKey(leaf)) return false;
  if (OMIT_FLATTEN_KEYS.has(leaf)) return false;
  return true;
}

function flattenRecord(
  record: LooseRecord,
  prefix = "",
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (shouldOmitFlattenKey(key)) continue;

    const path = prefix ? `${prefix}.${key}` : key;

    if (value === null || value === undefined) {
      flat[path] = "";
      continue;
    }

    if (Array.isArray(value)) {
      flat[path] =
        value.length === 0
          ? ""
          : value.every((item) => item === null || typeof item !== "object")
            ? value.map(String).join(", ")
            : cellPreview(value);
      continue;
    }

    if (isPlainObject(value)) {
      Object.assign(flat, flattenRecord(value, path));
      continue;
    }

    flat[path] = value;
  }

  return flat;
}

function inferFlattenedColumns(rows: Record<string, unknown>[]): string[] {
  const keys = new Set<string>();

  for (const row of rows) {
    Object.keys(row).forEach((key) => {
      if (shouldIncludeColumnKey(key)) {
        keys.add(key);
      }
    });
  }

  return [...keys].sort((a, b) => {
    const aLeaf = a.split(".").pop() ?? a;
    const bLeaf = b.split(".").pop() ?? b;
    const aPriority = PRIORITY_COLUMN_KEYS.indexOf(aLeaf);
    const bPriority = PRIORITY_COLUMN_KEYS.indexOf(bLeaf);
    if (aPriority !== -1 || bPriority !== -1) {
      if (aPriority === -1) return 1;
      if (bPriority === -1) return -1;
      return aPriority - bPriority;
    }
    return a.localeCompare(b);
  });
}

function enrichEntityReference(
  record: LooseRecord,
  idField: string,
  labelField: string,
  lookup: Map<string, string>,
  populatedLabelKey?: string,
): LooseRecord {
  const enriched = { ...record };
  const raw = enriched[idField];
  if (raw === undefined) return enriched;

  let label = "";
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const id = resolveEntityId(raw);
    if (populatedLabelKey && obj[populatedLabelKey]) {
      label = String(obj[populatedLabelKey]);
    } else {
      label = lookup.get(id) ?? "";
    }
  } else {
    label = lookup.get(String(raw)) ?? "";
  }

  enriched[labelField] = label;
  delete enriched[idField];
  return enriched;
}

function buildLookup<T extends { _id: string }>(
  items: T[] | undefined,
  labelFn: (item: T) => string,
): Map<string, string> {
  return new Map((items ?? []).map((item) => [item._id, labelFn(item)]));
}

function buildSheetFromRecords(
  records: LooseRecord[] | undefined,
  emptyMessage: string,
): {
  columns: SheetColumn[];
  rows: SheetRow[];
  recordMeta: UtilityAuditPreviewRecordMeta[];
} {
  const list = records ?? [];

  if (!list.length) {
    return {
      columns: [{ key: "message", label: "Message", width: 320 }],
      rows: [{ message: emptyMessage }],
      recordMeta: [],
    };
  }

  const flattenedRows = list.map((record) => flattenRecord(record));
  const columnKeys = inferFlattenedColumns(flattenedRows);

  const columns: SheetColumn[] = columnKeys.map((key) => ({
    key,
    label: getPreviewFieldLabel(key),
    width: Math.min(280, Math.max(120, getPreviewFieldLabel(key).length * 7)),
    type:
      typeof flattenedRows.find((row) => typeof row[key] === "number")?.[key] ===
      "number"
        ? "number"
        : "text",
  }));

  const rows: SheetRow[] = flattenedRows.map((flat) => {
    const row: SheetRow = {};
    for (const key of columnKeys) {
      const value = flat[key];
      if (typeof value === "number") {
        row[key] = value;
      } else {
        row[key] =
          key === "is_completed" || key.endsWith(".is_completed")
            ? value === true
              ? "Completed"
              : "Pending"
            : cellPreview(value);
      }
    }
    return row;
  });

  const recordMeta = list
    .map((record) => ({
      id: String(record._id ?? ""),
      isCompleted: record.is_completed === true,
    }))
    .filter((meta) => meta.id.length > 0);

  return { columns, rows, recordMeta };
}

function isEmptySectionMessage(section: UtilityAuditPreviewSheetSection): boolean {
  return (
    section.rows.length === 1 &&
    section.columns.length === 1 &&
    section.columns[0]?.key === "message"
  );
}

export function countSectionRows(section: UtilityAuditPreviewSheetSection): number {
  return isEmptySectionMessage(section) ? 0 : section.rows.length;
}

export function buildSection(
  id: string,
  title: string,
  records: LooseRecord[] | undefined,
  emptyMessage: string,
  supportsCompletenessToggle = true,
): UtilityAuditPreviewSheetSection {
  const { columns, rows, recordMeta } = buildSheetFromRecords(records, emptyMessage);
  const hasRecords = recordMeta.length > 0;
  return {
    id,
    title,
    columns,
    rows,
    recordMeta: hasRecords ? recordMeta : undefined,
    supportsCompletenessToggle: supportsCompletenessToggle && hasRecords,
  };
}

type StepSheetConfigFn = (
  ctx: EnergyAuditRecordCompletionContext,
) => {
  sections: UtilityAuditPreviewSheetSection[];
};

const STEP_SHEET_CONFIG: Record<string, StepSheetConfigFn> = {
  [UTILITY_AUDIT_STEP_IDS.TARIFF]: (ctx) => ({
    sections: [
      buildSection(
        "tariff-records",
        "Tariff Records",
        (ctx.tariffs ?? []) as LooseRecord[],
        "No tariff records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.BILLING]: (ctx) => ({
    sections: [
      buildSection(
        "billing-records",
        "Billing Records",
        (ctx.billingRecords ?? []) as LooseRecord[],
        "No billing records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.HVAC]: (ctx) => ({
    sections: [
      buildSection(
        "hvac-records",
        "HVAC Audit Records",
        (ctx.hvacRecords ?? []) as LooseRecord[],
        "No HVAC audit records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.AC]: (ctx) => ({
    sections: [
      buildSection(
        "ac-records",
        "AC Audit Records",
        (ctx.acRecords ?? []) as LooseRecord[],
        "No AC audit records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.LIGHTING]: (ctx) => ({
    sections: [
      buildSection(
        "lighting-records",
        "Lighting Audit Records",
        (ctx.lightingRecords ?? []) as LooseRecord[],
        "No lighting audit records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.STREET_LIGHT]: (ctx) => ({
    sections: [
      buildSection(
        "street-light-records",
        "Street Light Audit Records",
        (ctx.streetLightRecords ?? []) as LooseRecord[],
        "No street light audit records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.FAN]: (ctx) => ({
    sections: [
      buildSection(
        "fan-records",
        "Fan Audit Records",
        (ctx.fanRecords ?? []) as LooseRecord[],
        "No fan audit records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.LUX]: (ctx) => ({
    sections: [
      buildSection(
        "lux-records",
        "LUX Measurements",
        (ctx.luxRecords ?? []) as LooseRecord[],
        "No LUX measurement records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.UPS]: (ctx) => ({
    sections: [
      buildSection(
        "ups-records",
        "UPS System Audit Records",
        (ctx.upsRecords ?? []) as LooseRecord[],
        "No UPS system audit records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.MISC]: (ctx) => ({
    sections: [
      buildSection(
        "misc-records",
        "Misc Load Audit Records",
        (ctx.miscRecords ?? []) as LooseRecord[],
        "No misc load audit records for this utility account.",
      ),
    ],
  }),
  [UTILITY_AUDIT_STEP_IDS.SOLAR]: (ctx) => {
    const plantLookup = buildLookup(
      ctx.solarPlants as Array<{ _id: string; plant_name?: string }> | undefined,
      (plant) => plant.plant_name?.trim() || "Unnamed plant",
    );

    const generationRecords = ((ctx.solarGenerationRecords ?? []) as LooseRecord[]).map(
      (record) =>
        enrichEntityReference(
          record,
          "solar_plant_id",
          "solar_plant",
          plantLookup,
          "plant_name",
        ),
    );

    return {
      sections: [
        buildSection(
          "solar-plants",
          "Solar Plants",
          (ctx.solarPlants ?? []) as LooseRecord[],
          "No solar plants configured for this utility account.",
          false,
        ),
        buildSection(
          "solar-generation-records",
          "Generation Audit Records",
          generationRecords,
          "No solar generation audit records yet.",
        ),
      ],
    };
  },
  [UTILITY_AUDIT_STEP_IDS.DG]: (ctx) => {
    const dgLookup = buildLookup(
      ctx.dgSets as Array<{ _id: string; dg_number?: string }> | undefined,
      (dg) => dg.dg_number?.trim() || "Unnamed DG set",
    );

    const auditRecords = ((ctx.dgAuditRecords ?? []) as LooseRecord[]).map(
      (record) =>
        enrichEntityReference(record, "dg_set_id", "dg_set", dgLookup, "dg_number"),
    );

    return {
      sections: [
        buildSection(
          "dg-sets",
          "DG Sets",
          (ctx.dgSets ?? []) as LooseRecord[],
          "No DG sets configured for this utility account.",
          false,
        ),
        buildSection(
          "dg-audit-records",
          "DG Audit Records",
          auditRecords,
          "No DG audit records yet.",
        ),
      ],
    };
  },
  [UTILITY_AUDIT_STEP_IDS.TRANSFORMER]: (ctx) => {
    const transformerLookup = buildLookup(
      ctx.transformers as
        | Array<{ _id: string; transformer_tag?: string }>
        | undefined,
      (transformer) => transformer.transformer_tag?.trim() || "Unnamed transformer",
    );

    const auditRecords = ((ctx.transformerAuditRecords ?? []) as LooseRecord[]).map(
      (record) =>
        enrichEntityReference(
          record,
          "transformer_id",
          "transformer",
          transformerLookup,
          "transformer_tag",
        ),
    );

    return {
      sections: [
        buildSection(
          "transformers",
          "Transformers",
          (ctx.transformers ?? []) as LooseRecord[],
          "No transformers configured for this utility account.",
          false,
        ),
        buildSection(
          "transformer-audit-records",
          "Transformer Audit Records",
          auditRecords,
          "No transformer audit records yet.",
        ),
      ],
    };
  },
  [UTILITY_AUDIT_STEP_IDS.PUMP]: (ctx) => {
    const pumpLookup = buildLookup(
      ctx.pumps as Array<{ _id: string; pump_tag_number?: string }> | undefined,
      (pump) => pump.pump_tag_number?.trim() || "Unnamed pump",
    );

    const auditRecords = ((ctx.pumpAuditRecords ?? []) as LooseRecord[]).map(
      (record) =>
        enrichEntityReference(record, "pump_id", "pump", pumpLookup, "pump_tag_number"),
    );

    return {
      sections: [
        buildSection(
          "pumps",
          "Pumps",
          (ctx.pumps ?? []) as LooseRecord[],
          "No pumps configured for this utility account.",
          false,
        ),
        buildSection(
          "pump-audit-records",
          "Pump Audit Records",
          auditRecords,
          "No pump audit records yet.",
        ),
      ],
    };
  },
};

export function buildUtilityAuditPreviewSheetTabs(
  includedStepIds: string[],
  context: EnergyAuditRecordCompletionContext,
): UtilityAuditPreviewSheetTab[] {
  return includedStepIds
    .map((stepId) => {
      const config = STEP_SHEET_CONFIG[stepId];
      const sheetKey = AUDIT_STEP_TO_DATASHEET_KEY[stepId] ?? stepId;
      if (!config) return null;

      const { sections } = config(context);
      const rowCount = sections.reduce(
        (total, section) => total + countSectionRows(section),
        0,
      );

      return {
        stepId,
        sheetKey,
        label: UTILITY_AUDIT_STEP_LABELS[stepId] ?? stepId,
        sections,
        rowCount,
      };
    })
    .filter(Boolean) as UtilityAuditPreviewSheetTab[];
}
