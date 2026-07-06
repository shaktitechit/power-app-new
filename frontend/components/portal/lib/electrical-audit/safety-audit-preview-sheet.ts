import {
  ELECTRICAL_SAFETY_AUDIT_STEPS,
  SAFETY_AUDIT_STEP_LABELS,
} from "@/components/portal/lib/electrical-audit/safety-audit-workflow";
import type {
  SafetyAuditRecord,
  SafetyChecklistItem,
} from "@/store/slices/safety-audit/safetyAuditTypes";
import type {
  SheetColumn,
  SheetRow,
} from "@/components/portal/shared/components/google-sheet-grid";
import {
  buildSection,
  countSectionRows,
  exportPreviewTabToCsv,
  type UtilityAuditPreviewSheetSection,
  type UtilityAuditPreviewSheetTab,
} from "@/components/portal/lib/electrical-audit/utility-audit-preview-sheet";

export type { UtilityAuditPreviewSheetTab };
export { exportPreviewTabToCsv };

export type SafetyAuditRecordCompletionContext = {
  transformers?: SafetyAuditRecord[];
  "metering-room"?: SafetyAuditRecord[];
  "panel-room"?: SafetyAuditRecord[];
  "light-db"?: SafetyAuditRecord[];
  "dg-set"?: SafetyAuditRecord[];
  "earthing-system"?: SafetyAuditRecord[];
  "ups-battery"?: SafetyAuditRecord[];
  "general-safety"?: SafetyAuditRecord[];
  "wiring-inspection"?: SafetyAuditRecord[];
  "load-analysis"?: SafetyAuditRecord[];
  "leak-inspection"?: SafetyAuditRecord[];
  thermography?: SafetyAuditRecord[];
  "elevator-safety"?: SafetyAuditRecord[];
  "pac-ventilation"?: SafetyAuditRecord[];
  "pump-compressor"?: SafetyAuditRecord[];
  "additional-items"?: SafetyAuditRecord[];
  "documents-review"?: SafetyAuditRecord[];
};

type LooseRecord = Record<string, unknown>;

const OMIT_RECORD_KEYS = new Set(["items", "documents", "images"]);

const CHECKLIST_SHEET_COLUMNS: SheetColumn[] = [
  { key: "sr_no", label: "#", width: 50, type: "number" },
  {
    key: "activity_description",
    label: "Activity / Observation",
    width: 280,
    type: "text",
  },
  { key: "requirement", label: "Requirement", width: 180, type: "text" },
  { key: "compliance", label: "Compliance", width: 100, type: "text" },
  { key: "remarks", label: "Remarks", width: 160, type: "text" },
  {
    key: "recommendations",
    label: "Recommendations",
    width: 160,
    type: "text",
  },
  { key: "severity", label: "Severity", width: 90, type: "text" },
];

function sanitizeSafetyRecord(record: SafetyAuditRecord): LooseRecord {
  const copy: LooseRecord = { ...record };
  for (const key of OMIT_RECORD_KEYS) {
    delete copy[key];
  }
  if (copy.dg_set_id && typeof copy.dg_set_id === "object") {
    const dg = copy.dg_set_id as Record<string, unknown>;
    copy.dg_set =
      dg.dg_number ?? dg.name ?? dg.make_model ?? String(dg._id ?? "");
    delete copy.dg_set_id;
  }
  if (copy.transformer_id && typeof copy.transformer_id === "object") {
    const tr = copy.transformer_id as Record<string, unknown>;
    copy.transformer =
      tr.transformer_tag ?? tr.name ?? String(tr._id ?? "");
    delete copy.transformer_id;
  }
  return copy;
}

function rawRecordsForStep(
  stepId: string,
  context: SafetyAuditRecordCompletionContext,
): SafetyAuditRecord[] {
  return context[stepId as keyof SafetyAuditRecordCompletionContext] ?? [];
}

function recordsForStep(
  stepId: string,
  context: SafetyAuditRecordCompletionContext,
): LooseRecord[] {
  return rawRecordsForStep(stepId, context).map(sanitizeSafetyRecord);
}

function sectionIdForStep(stepId: string): string {
  return `${stepId}-records`;
}

function checklistSectionIdForRecord(stepId: string, recordKey: string): string {
  return `${stepId}-checklist-${recordKey}`;
}

export function isSafetyChecklistPreviewSection(sectionId: string): boolean {
  return /-checklist-/.test(sectionId);
}

function formatChecklistCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value.trim() || "—";
  return String(value);
}

function getSafetyRecordLabel(
  record: SafetyAuditRecord,
  index: number,
  stepLabel: string,
): string {
  const nameFields = [
    "panel_name",
    "ldb_name",
    "elevator_name",
    "equipment_name",
    "area_name",
    "unit_name",
    "pit_name",
    "name",
    "location",
  ];

  for (const field of nameFields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  if (record.dg_set_id && typeof record.dg_set_id === "object") {
    const dg = record.dg_set_id as Record<string, unknown>;
    const label = dg.dg_number ?? dg.name ?? dg.make_model;
    if (label) return String(label);
  }

  if (record.transformer_id && typeof record.transformer_id === "object") {
    const tr = record.transformer_id as Record<string, unknown>;
    if (tr.transformer_tag) return String(tr.transformer_tag);
  }

  const inspectedBy =
    typeof record.inspected_by === "string" ? record.inspected_by.trim() : "";
  if (inspectedBy) return inspectedBy;

  return `${stepLabel} ${index + 1}`;
}

function buildChecklistRows(items: SafetyChecklistItem[]): SheetRow[] {
  return items
    .filter((item) => item && typeof item === "object")
    .map((checklistItem, itemIndex) => ({
      sr_no: checklistItem.sr_no ?? itemIndex + 1,
      activity_description: formatChecklistCell(
        checklistItem.activity_description,
      ),
      requirement: formatChecklistCell(checklistItem.requirement),
      compliance: formatChecklistCell(checklistItem.compliance),
      remarks: formatChecklistCell(checklistItem.remarks),
      recommendations: formatChecklistCell(checklistItem.recommendations),
      severity: formatChecklistCell(checklistItem.severity),
    }));
}

function buildRecordChecklistSections(
  stepId: string,
  stepLabel: string,
  records: SafetyAuditRecord[],
): UtilityAuditPreviewSheetSection[] {
  return records.map((record, recordIndex) => {
    const recordLabel = getSafetyRecordLabel(record, recordIndex, stepLabel);
    const recordKey = record._id || String(recordIndex);
    const recordStatus = record.is_completed === true ? "Completed" : "Pending";
    const items = Array.isArray(record.items) ? record.items : [];
    const rows = buildChecklistRows(items);

    if (rows.length === 0) {
      return {
        id: checklistSectionIdForRecord(stepId, recordKey),
        title: `${recordLabel} — Checklist`,
        columns: [{ key: "message", label: "Message", width: 320 }],
        rows: [{ message: "No checklist items recorded for this record yet." }],
        supportsCompletenessToggle: false,
      };
    }

    return {
      id: checklistSectionIdForRecord(stepId, recordKey),
      title: `${recordLabel} — Checklist · ${recordStatus}`,
      columns: CHECKLIST_SHEET_COLUMNS,
      rows,
      supportsCompletenessToggle: false,
    };
  });
}

export function buildSafetyAuditPreviewSheetTabs(
  includedStepIds: string[],
  context: SafetyAuditRecordCompletionContext,
): UtilityAuditPreviewSheetTab[] {
  return includedStepIds
    .map((stepId) => {
      const label = SAFETY_AUDIT_STEP_LABELS[stepId] ?? stepId;
      const rawRecords = rawRecordsForStep(stepId, context);
      const records = recordsForStep(stepId, context);
      const recordsSection = buildSection(
        sectionIdForStep(stepId),
        `${label} Records`,
        records,
        `No ${label.toLowerCase()} records yet.`,
      );
      const checklistSections = buildRecordChecklistSections(
        stepId,
        label,
        rawRecords,
      );

      return {
        stepId,
        sheetKey: stepId,
        label,
        sections: [recordsSection, ...checklistSections],
        rowCount: countSectionRows(recordsSection),
      };
    })
    .filter(Boolean) as UtilityAuditPreviewSheetTab[];
}

/** All safety preview section ids (for completeness hook registration). */
export const SAFETY_PREVIEW_SECTION_IDS = ELECTRICAL_SAFETY_AUDIT_STEPS.map(
  (step) => sectionIdForStep(step.id),
);
