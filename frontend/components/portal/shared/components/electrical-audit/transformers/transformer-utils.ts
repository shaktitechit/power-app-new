import type {
  CreateTransformerRequest,
  Transformer,
} from "@/store/slices/electrical-audit/transformerApiSlice";

export type TransformerFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  transformer_tag: string;
  rated_capacity_kVA: string;
  type_of_cooling: "ONAN" | "ONAF" | "OFWF" | "ODAF" | "dry";
  rated_HV_kV: string;
  rated_LV_V: string;
  rated_HV_current_A: string;
  rated_LV_current_A: string;
  no_load_loss_kW: string;
  full_load_loss_kW: string;
  nameplate_efficiency_percent: string;
};

export const editableInputClass =
  "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary";

const toStringValue = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

export function createEmptyForm(): TransformerFormState {
  return {
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isNew: true,
    transformer_tag: "",
    rated_capacity_kVA: "",
    type_of_cooling: "ONAN",
    rated_HV_kV: "",
    rated_LV_V: "",
    rated_HV_current_A: "",
    rated_LV_current_A: "",
    no_load_loss_kW: "",
    full_load_loss_kW: "",
    nameplate_efficiency_percent: "",
  };
}

export function transformerToForm(transformer: Transformer): TransformerFormState {
  return {
    id: transformer._id,
    localId: transformer._id,
    isNew: false,
    transformer_tag: transformer.transformer_tag || "",
    rated_capacity_kVA: toStringValue(transformer.rated_capacity_kVA),
    type_of_cooling: transformer.type_of_cooling || "ONAN",
    rated_HV_kV: toStringValue(transformer.rated_HV_kV),
    rated_LV_V: toStringValue(transformer.rated_LV_V),
    rated_HV_current_A: toStringValue(transformer.rated_HV_current_A),
    rated_LV_current_A: toStringValue(transformer.rated_LV_current_A),
    no_load_loss_kW: toStringValue(transformer.no_load_loss_kW),
    full_load_loss_kW: toStringValue(transformer.full_load_loss_kW),
    nameplate_efficiency_percent: toStringValue(transformer.nameplate_efficiency_percent),
  };
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildTransformerPayload(
  form: TransformerFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateTransformerRequest {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    transformer_tag: form.transformer_tag.trim(),
    rated_capacity_kVA: toNumber(form.rated_capacity_kVA),
    type_of_cooling: form.type_of_cooling,
    rated_HV_kV: toNumber(form.rated_HV_kV),
    rated_LV_V: toNumber(form.rated_LV_V),
    rated_HV_current_A: toNumber(form.rated_HV_current_A),
    rated_LV_current_A: toNumber(form.rated_LV_current_A),
    no_load_loss_kW: toNumber(form.no_load_loss_kW),
    full_load_loss_kW: toNumber(form.full_load_loss_kW),
    nameplate_efficiency_percent: toNumber(form.nameplate_efficiency_percent),
  };
}

export function sortTransformersStable(transformers: Transformer[]): Transformer[] {
  return [...transformers].sort((a, b) => {
    const labelA = a.transformer_tag?.trim() || "";
    const labelB = b.transformer_tag?.trim() || "";
    if (labelA && labelB && labelA !== labelB) {
      return labelA.localeCompare(labelB, undefined, { numeric: true });
    }

    const ta = Date.parse(a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getTransformerTabLabel(transformer: Transformer, index: number) {
  const tag = transformer.transformer_tag?.trim();
  return tag ? `Transformer ${tag}` : `Transformer ${index + 1}`;
}

export function updateTransformerForm(
  form: TransformerFormState,
  updater: (form: TransformerFormState) => TransformerFormState,
): TransformerFormState {
  return updater(form);
}

export function resolveTransformerIdFromAuditRecord(
  transformerId: string | { _id?: string } | null | undefined,
): string {
  if (!transformerId) return "";
  if (typeof transformerId === "object") {
    return String(transformerId._id ?? "");
  }
  return String(transformerId);
}

export function transformerHasAudit(
  transformerId: string,
  transformerAuditRecords: Array<{ transformer_id: string | { _id?: string } }>,
): boolean {
  return transformerAuditRecords.some(
    (record) => resolveTransformerIdFromAuditRecord(record.transformer_id) === transformerId,
  );
}
