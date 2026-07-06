import { UTILITY_AUDIT_STEP_IDS } from "@/components/portal/lib/electrical-audit/utility-audit-steps";
import { filterSolarRecordsForPlant } from "@/components/portal/shared/components/electrical-audit/solar-plants/solar-generation-record-utils";

type CompletenessRecord = {
  is_completed?: boolean;
};

export type EnergyAuditRecordCompletionContext = {
  tariffs?: CompletenessRecord[];
  billingRecords?: CompletenessRecord[];
  hvacRecords?: CompletenessRecord[];
  acRecords?: CompletenessRecord[];
  lightingRecords?: CompletenessRecord[];
  streetLightRecords?: CompletenessRecord[];
  fanRecords?: CompletenessRecord[];
  luxRecords?: CompletenessRecord[];
  upsRecords?: CompletenessRecord[];
  miscRecords?: CompletenessRecord[];
  solarPlants?: Array<{ _id: string }>;
  solarGenerationRecords?: CompletenessRecord[];
  dgSets?: Array<{ _id: string }>;
  dgAuditRecords?: Array<CompletenessRecord & { dg_set_id?: unknown }>;
  transformers?: Array<{ _id: string }>;
  transformerAuditRecords?: Array<
    CompletenessRecord & { transformer_id?: unknown }
  >;
  pumps?: Array<{ _id: string }>;
  pumpAuditRecords?: Array<CompletenessRecord & { pump_id?: unknown }>;
};

const allRecordsCompleted = (records: CompletenessRecord[] | undefined) => {
  const list = records ?? [];
  return list.length > 0 && list.every((record) => record.is_completed === true);
};

const resolveEntityId = (value: unknown) => {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "_id" in value) {
    return String((value as { _id?: string })._id ?? "");
  }
  return String(value);
};

const entityAuditsAllCompleted = (
  entities: Array<{ _id: string }> | undefined,
  auditRecords:
    | Array<CompletenessRecord & Record<string, unknown>>
    | undefined,
  entityIdField: string,
) => {
  const list = entities ?? [];
  if (list.length === 0) return false;

  return list.every((entity) => {
    const matching = (auditRecords ?? []).filter(
      (record) => resolveEntityId(record[entityIdField]) === entity._id,
    );

    return (
      matching.length > 0 &&
      matching.every((record) => record.is_completed === true)
    );
  });
};

const isSolarStepCompleted = (ctx: EnergyAuditRecordCompletionContext) => {
  const plants = ctx.solarPlants ?? [];
  const billingRecords = ctx.billingRecords ?? [];
  const solarGenerationRecords = ctx.solarGenerationRecords ?? [];

  if (plants.length === 0 || billingRecords.length === 0) {
    return false;
  }

  return plants.every((plant) => {
    const plantRecords = filterSolarRecordsForPlant(
      solarGenerationRecords as Parameters<typeof filterSolarRecordsForPlant>[0],
      plant._id,
    );

    if (plantRecords.length < billingRecords.length) {
      return false;
    }

    return plantRecords.every((record) => record.is_completed === true);
  });
};

/** Derive section readiness from loaded audit records (`is_completed`). */
export function isUtilityAuditStepCompletedFromRecords(
  stepId: string,
  ctx: EnergyAuditRecordCompletionContext,
): boolean {
  switch (stepId) {
    case UTILITY_AUDIT_STEP_IDS.TARIFF:
      return allRecordsCompleted(ctx.tariffs);
    case UTILITY_AUDIT_STEP_IDS.BILLING:
      return allRecordsCompleted(ctx.billingRecords);
    case UTILITY_AUDIT_STEP_IDS.HVAC:
      return allRecordsCompleted(ctx.hvacRecords);
    case UTILITY_AUDIT_STEP_IDS.AC:
      return allRecordsCompleted(ctx.acRecords);
    case UTILITY_AUDIT_STEP_IDS.LIGHTING:
      return allRecordsCompleted(ctx.lightingRecords);
    case UTILITY_AUDIT_STEP_IDS.STREET_LIGHT:
      return allRecordsCompleted(ctx.streetLightRecords);
    case UTILITY_AUDIT_STEP_IDS.FAN:
      return allRecordsCompleted(ctx.fanRecords);
    case UTILITY_AUDIT_STEP_IDS.LUX:
      return allRecordsCompleted(ctx.luxRecords);
    case UTILITY_AUDIT_STEP_IDS.UPS:
      return allRecordsCompleted(ctx.upsRecords);
    case UTILITY_AUDIT_STEP_IDS.MISC:
      return allRecordsCompleted(ctx.miscRecords);
    case UTILITY_AUDIT_STEP_IDS.SOLAR:
      return isSolarStepCompleted(ctx);
    case UTILITY_AUDIT_STEP_IDS.DG:
      return entityAuditsAllCompleted(
        ctx.dgSets,
        ctx.dgAuditRecords,
        "dg_set_id",
      );
    case UTILITY_AUDIT_STEP_IDS.TRANSFORMER:
      return entityAuditsAllCompleted(
        ctx.transformers,
        ctx.transformerAuditRecords,
        "transformer_id",
      );
    case UTILITY_AUDIT_STEP_IDS.PUMP:
      return entityAuditsAllCompleted(
        ctx.pumps,
        ctx.pumpAuditRecords,
        "pump_id",
      );
    default:
      return false;
  }
}
