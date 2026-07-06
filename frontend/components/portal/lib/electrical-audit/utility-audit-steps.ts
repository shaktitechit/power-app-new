/** Tab / API keys for utility account audit workflow (matches backend ALLOWED_AUDIT_STEPS) */
import {
  isDataSheetSectionIncluded as checkDataSheetSectionIncluded,
  type DataSheetKey,
} from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";

export const UTILITY_AUDIT_STEP_IDS = {
  TARIFF: "tarrif",
  BILLING: "utility-billing-records",
  SOLAR: "solar-plants",
  DG: "dg-sets",
  TRANSFORMER: "transformer",
  PUMP: "pump",
  HVAC: "hvac",
  AC: "ac",
  LIGHTING: "lighting",
  STREET_LIGHT: "street-light",
  FAN: "fan",
  LUX: "lux",
  UPS: "ups",
  MISC: "misc",
  PREVIEW_SUBMIT: "preview-and-submit",
} as const;

export type UtilityAuditStepId =
  (typeof UTILITY_AUDIT_STEP_IDS)[keyof typeof UTILITY_AUDIT_STEP_IDS];

export type AccountStatus = "pending" | "completed";

/** Older safety-only flows stored final submit here; treat as complete alongside `preview-and-submit`. */
export const LEGACY_SAFETY_ONLY_FINAL_SUBMIT_STEP_ID =
  "safety-preview-and-submit" as const;

export const UTILITY_AUDIT_STEP_LABELS: Record<string, string> = {
  [UTILITY_AUDIT_STEP_IDS.TARIFF]: "Utility tariff",
  [UTILITY_AUDIT_STEP_IDS.BILLING]: "Utility billing records",
  [UTILITY_AUDIT_STEP_IDS.SOLAR]: "Solar audit",
  [UTILITY_AUDIT_STEP_IDS.DG]: "DG audit",
  [UTILITY_AUDIT_STEP_IDS.TRANSFORMER]: "Transformer audit",
  [UTILITY_AUDIT_STEP_IDS.PUMP]: "Pump audit",
  [UTILITY_AUDIT_STEP_IDS.HVAC]: "HVAC audit",
  [UTILITY_AUDIT_STEP_IDS.AC]: "AC audit",
  [UTILITY_AUDIT_STEP_IDS.LIGHTING]: "Lighting audit",
  [UTILITY_AUDIT_STEP_IDS.STREET_LIGHT]: "Street Light audit",
  [UTILITY_AUDIT_STEP_IDS.FAN]: "Fan audit",
  [UTILITY_AUDIT_STEP_IDS.LUX]: "LUX measurement",
  [UTILITY_AUDIT_STEP_IDS.UPS]: "UPS audit",
  [UTILITY_AUDIT_STEP_IDS.MISC]: "Misc audit",
  [UTILITY_AUDIT_STEP_IDS.PREVIEW_SUBMIT]: "Preview and submit",
};

/** Energy & Safety audit API step id -> dataSheet key */
export const AUDIT_STEP_TO_DATASHEET_KEY: Record<string, string> = {
  [UTILITY_AUDIT_STEP_IDS.TARIFF]: "tariff",
  [UTILITY_AUDIT_STEP_IDS.BILLING]: "billing",
  [UTILITY_AUDIT_STEP_IDS.SOLAR]: "solar",
  [UTILITY_AUDIT_STEP_IDS.DG]: "dg",
  [UTILITY_AUDIT_STEP_IDS.TRANSFORMER]: "transformer",
  [UTILITY_AUDIT_STEP_IDS.PUMP]: "pump",
  [UTILITY_AUDIT_STEP_IDS.HVAC]: "hvac",
  [UTILITY_AUDIT_STEP_IDS.AC]: "ac",
  [UTILITY_AUDIT_STEP_IDS.LIGHTING]: "lighting",
  [UTILITY_AUDIT_STEP_IDS.STREET_LIGHT]: "street-light",
  [UTILITY_AUDIT_STEP_IDS.FAN]: "fan",
  [UTILITY_AUDIT_STEP_IDS.LUX]: "lux",
  [UTILITY_AUDIT_STEP_IDS.UPS]: "ups",
  [UTILITY_AUDIT_STEP_IDS.MISC]: "misc",
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

export function getDataSheetKeyForStep(step: string): string | undefined {
  return AUDIT_STEP_TO_DATASHEET_KEY[step];
}

export function isDataSheetSectionIncludedForStep(
  account:
    | {
        dataSheet?: Record<string, { connected?: boolean }>;
      }
    | undefined
    | null,
  step: string,
): boolean {
  const key = getDataSheetKeyForStep(step);
  if (!key) return true;
  return checkDataSheetSectionIncluded(
    account?.dataSheet as Parameters<typeof checkDataSheetSectionIncluded>[0],
    key as DataSheetKey,
  );
}

export { isDataSheetSectionIncluded } from "@/components/portal/lib/electrical-audit/utility-data-sheet-sections";

export function getDataSheetSection(
  account:
    | {
        dataSheet?: Record<
          string,
          { status?: string; completed_at?: string }
        >;
      }
    | undefined
    | null,
  step: string,
) {
  const key = getDataSheetKeyForStep(step);
  if (!key || !account?.dataSheet) return undefined;
  return account.dataSheet[key];
}

export function isDataSheetSectionCompleted(
  account:
    | {
        dataSheet?: Record<string, { status?: string }>;
      }
    | undefined
    | null,
  step: string,
): boolean {
  const section = getDataSheetSection(account, step);
  return section?.status === "completed";
}

export function getAuditSubmission(
  submissions: Record<string, { submitted_at?: string }> | undefined,
  step: string,
): { submitted_at?: string } | undefined {
  if (!submissions || typeof submissions !== "object") return undefined;
  const entry = submissions[step];
  if (!entry || typeof entry !== "object") return undefined;
  return entry as { submitted_at?: string };
}

/** True if utility account has a unified or legacy final submission. */
export function hasUtilityFinalAuditSubmission(
  submissions:
    | Record<string, { submitted_at?: string | undefined } | undefined>
    | undefined,
  account?: { accountStatus?: AccountStatus } | null,
): boolean {
  if (account?.accountStatus === "completed") return true;

  return Boolean(
    getAuditSubmission(submissions, UTILITY_AUDIT_STEP_IDS.PREVIEW_SUBMIT)
      ?.submitted_at ||
      getAuditSubmission(
        submissions,
        LEGACY_SAFETY_ONLY_FINAL_SUBMIT_STEP_ID,
      )?.submitted_at,
  );
}

/** Prefer dataSheet / accountStatus; fall back to legacy submissions. */
export function getUtilityAuditStepState(
  account:
    | {
        accountStatus?: AccountStatus;
        dataSheet?: Record<
          string,
          {
            status?: string;
            completed_at?: string;
            completed_by?: unknown;
          }
        >;
        audit_step_submissions?: Record<
          string,
          { submitted_at?: string; submitted_by?: unknown }
        >;
      }
    | undefined
    | null,
  step: string,
): {
  completed: boolean;
  submitted_at?: string;
} {
  const sheetSection = getDataSheetSection(account, step);
  if (sheetSection) {
    return {
      completed: sheetSection.status === "completed",
      submitted_at: sheetSection.completed_at,
    };
  }

  const legacySubmission = getAuditSubmission(account?.audit_step_submissions, step);

  return {
    completed: Boolean(legacySubmission?.submitted_at),
    submitted_at: legacySubmission?.submitted_at,
  };
}

/** Prefer unified key; fall back to legacy for display (dates / completed by). */
export function getUtilityFinalAuditSubmissionEntry(
  submissions:
    | Record<
        string,
        | { submitted_at?: string; submitted_by?: unknown }
        | undefined
      >
    | undefined,
): { submitted_at?: string; submitted_by?: unknown } | undefined {
  const cur = submissions?.[UTILITY_AUDIT_STEP_IDS.PREVIEW_SUBMIT];
  if (cur && typeof cur === "object" && cur.submitted_at) return cur;
  const legacy = submissions?.[LEGACY_SAFETY_ONLY_FINAL_SUBMIT_STEP_ID];
  if (legacy && typeof legacy === "object") return legacy;
  return undefined;
}
