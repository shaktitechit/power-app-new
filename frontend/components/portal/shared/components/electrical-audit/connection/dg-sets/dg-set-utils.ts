import type {
  CreateDGSetRequest,
  DGSet,
} from "@/store/slices/electrical-audit/dgSetApiSlice";

export type DGSetFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  dg_number: string;
  make_model: string;
  year_of_installation: string;
  rated_capacity_kVA: string;
  rated_active_power_kW: string;
  rated_voltage_V: string;
  rated_speed_RPM: string;
  fuel_type: "diesel" | "gas" | "dual";
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

export function createEmptyForm(): DGSetFormState {
  return {
    localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    isNew: true,
    dg_number: "",
    make_model: "",
    year_of_installation: "",
    rated_capacity_kVA: "",
    rated_active_power_kW: "",
    rated_voltage_V: "",
    rated_speed_RPM: "",
    fuel_type: "diesel",
  };
}

export function dgSetToForm(dgSet: DGSet): DGSetFormState {
  return {
    id: dgSet._id,
    localId: dgSet._id,
    isNew: false,
    dg_number: dgSet.dg_number || "",
    make_model: dgSet.make_model || "",
    year_of_installation: toStringValue(dgSet.year_of_installation),
    rated_capacity_kVA: toStringValue(dgSet.rated_capacity_kVA),
    rated_active_power_kW: toStringValue(dgSet.rated_active_power_kW),
    rated_voltage_V: toStringValue(dgSet.rated_voltage_V),
    rated_speed_RPM: toStringValue(dgSet.rated_speed_RPM),
    fuel_type: dgSet.fuel_type || "diesel",
  };
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function formatFuelType(value?: string) {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function buildDGSetPayload(
  form: DGSetFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateDGSetRequest {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    dg_number: form.dg_number.trim(),
    make_model: form.make_model.trim() || undefined,
    year_of_installation: toNumber(form.year_of_installation),
    rated_capacity_kVA: toNumber(form.rated_capacity_kVA),
    rated_active_power_kW: toNumber(form.rated_active_power_kW),
    rated_voltage_V: toNumber(form.rated_voltage_V),
    rated_speed_RPM: toNumber(form.rated_speed_RPM),
    fuel_type: form.fuel_type,
  };
}

export function sortDGSetsStable(dgSets: DGSet[]): DGSet[] {
  return [...dgSets].sort((a, b) => {
    const numA = Number.parseFloat(String(a.dg_number ?? ""));
    const numB = Number.parseFloat(String(b.dg_number ?? ""));
    if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
      return numA - numB;
    }

    const labelA = a.dg_number?.trim() || "";
    const labelB = b.dg_number?.trim() || "";
    if (labelA && labelB && labelA !== labelB) {
      return labelA.localeCompare(labelB, undefined, { numeric: true });
    }

    const ta = Date.parse(a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getDGSetTabLabel(dgSet: DGSet, index: number) {
  const number = dgSet.dg_number?.trim();
  return number ? `DG Set ${number}` : `DG Set ${index + 1}`;
}

export function updateDGSetForm(
  form: DGSetFormState,
  updater: (form: DGSetFormState) => DGSetFormState,
): DGSetFormState {
  return updater(form);
}

export function resolveDgSetIdFromAuditRecord(
  dgSetId: string | { _id?: string } | null | undefined,
): string {
  if (!dgSetId) return "";
  if (typeof dgSetId === "object") {
    return String(dgSetId._id ?? "");
  }
  return String(dgSetId);
}

export function dgSetHasAudit(
  dgSetId: string,
  dgAuditRecords: Array<{ dg_set_id: string | { _id?: string } }>,
): boolean {
  return dgAuditRecords.some(
    (record) => resolveDgSetIdFromAuditRecord(record.dg_set_id) === dgSetId,
  );
}
