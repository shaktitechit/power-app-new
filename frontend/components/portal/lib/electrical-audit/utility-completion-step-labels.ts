import { SAFETY_AUDIT_STEP_LABELS } from "@/components/portal/lib/electrical-audit/safety-audit-workflow";

/** Human-readable section names for utility account completionStats breakdown. */
const ENERGY_AUDIT_COMPLETION_STEP_LABELS: Record<string, string> = {
  tariff: "Utility Tariff",
  billing: "Billing Records",
  hvac: "HVAC Audit",
  ac: "AC Audit",
  lighting: "Lighting Audit",
  fan: "Fan Audit",
  lux: "LUX Measurement",
  misc: "Misc Audit",
  pump: "Pump Audit",
  dg: "DG Audit",
  transformer: "Transformer Audit",
  solar: "Solar Audit",
};

export function getUtilityCompletionStepLabel(key: string): string {
  return (
    ENERGY_AUDIT_COMPLETION_STEP_LABELS[key] ??
    SAFETY_AUDIT_STEP_LABELS[key] ??
    key
  );
}

export function mapUtilityCompletionBreakdown(
  breakdown: Array<{ key: string; isDone: boolean }> | undefined | null,
): { label: string; isDone: boolean }[] {
  return (breakdown ?? []).map((item) => ({
    label: getUtilityCompletionStepLabel(item.key),
    isDone: item.isDone,
  }));
}
