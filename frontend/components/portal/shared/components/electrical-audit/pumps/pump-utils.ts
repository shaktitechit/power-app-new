import type {
  Pump,
  CreatePumpRequest,
  UpdatePumpRequest,
  PumpDocument,
} from "@/store/slices/electrical-audit/pumpApiSlice";
import type { PumpAuditRecord } from "@/store/slices/electrical-audit/pumpAuditRecordApiSlice";

export type PumpFormState = {
  id?: string;
  isNew: boolean;

  pump_tag_number: string;
  make_model: string;
  rated_power_kW_or_HP: string;
  rated_flow_m3_per_hr: string;
  rated_head_m: string;
  rated_speed_RPM: string;
  number_of_stages: string;
  year_of_installation: string;

  documents: File[];
  existingDocuments: PumpDocument[];
};

export const createEmptyForm = (): PumpFormState => ({
  isNew: true,
  pump_tag_number: "",
  make_model: "",
  rated_power_kW_or_HP: "",
  rated_flow_m3_per_hr: "",
  rated_head_m: "",
  rated_speed_RPM: "",
  number_of_stages: "",
  year_of_installation: "",
  documents: [],
  existingDocuments: [],
});

export const pumpToForm = (pump: Pump): PumpFormState => ({
  id: pump._id,
  isNew: false,
  pump_tag_number: pump.pump_tag_number || "",
  make_model: pump.make_model || "",
  rated_power_kW_or_HP: pump.rated_power_kW_or_HP?.toString() || "",
  rated_flow_m3_per_hr: pump.rated_flow_m3_per_hr?.toString() || "",
  rated_head_m: pump.rated_head_m?.toString() || "",
  rated_speed_RPM: pump.rated_speed_RPM?.toString() || "",
  number_of_stages: pump.number_of_stages?.toString() || "",
  year_of_installation: pump.year_of_installation?.toString() || "",
  documents: [],
  existingDocuments: pump.documents || [],
});

export const buildPumpPayload = (
  form: PumpFormState,
  facilityId: string,
  utilityAccountId: string,
): CreatePumpRequest => {
  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    pump_tag_number: form.pump_tag_number,
    make_model: form.make_model || undefined,
    rated_power_kW_or_HP: form.rated_power_kW_or_HP !== "" ? Number(form.rated_power_kW_or_HP) : undefined,
    rated_flow_m3_per_hr: form.rated_flow_m3_per_hr !== "" ? Number(form.rated_flow_m3_per_hr) : undefined,
    rated_head_m: form.rated_head_m !== "" ? Number(form.rated_head_m) : undefined,
    rated_speed_RPM: form.rated_speed_RPM !== "" ? Number(form.rated_speed_RPM) : undefined,
    number_of_stages: form.number_of_stages !== "" ? Number(form.number_of_stages) : undefined,
    year_of_installation: form.year_of_installation !== "" ? Number(form.year_of_installation) : undefined,
    documents: form.documents.length ? form.documents : undefined,
  };
};

export function sortPumpsStable(pumps: Pump[]): Pump[] {
  return [...pumps].sort((a, b) => {
    // Numeric-aware sorting by tag number
    const tagA = a.pump_tag_number || "";
    const tagB = b.pump_tag_number || "";
    const numA = parseInt(tagA.replace(/^\D+/g, ""), 10);
    const numB = parseInt(tagB.replace(/^\D+/g, ""), 10);

    if (!Number.isNaN(numA) && !Number.isNaN(numB)) {
      if (numA !== numB) return numA - numB;
    }
    const tagCompare = tagA.localeCompare(tagB, undefined, {
      numeric: true,
      sensitivity: "base",
    });
    if (tagCompare !== 0) return tagCompare;

    // Fallback to creation date
    const dateA = Date.parse(a.createdAt || a.created_at || "");
    const dateB = Date.parse(b.createdAt || b.created_at || "");
    if (!Number.isNaN(dateA) && !Number.isNaN(dateB)) {
      return dateA - dateB;
    }
    return String(a._id).localeCompare(String(b._id));
  });
}

export function getPumpTabLabel(pump: Pump, index: number): string {
  if (pump.pump_tag_number) {
    return `Pump ${pump.pump_tag_number}`;
  }
  return `Pump ${index + 1}`;
}

export function resolvePumpId(pumpId: any): string {
  if (!pumpId) return "";
  if (typeof pumpId === "object") {
    return String(pumpId._id ?? "");
  }
  return String(pumpId);
}

export function pumpHasAudit(
  pumpId: string,
  records: PumpAuditRecord[],
): boolean {
  return records.some((r) => resolvePumpId(r.pump_id) === pumpId);
}

export function pumpAuditCompleted(
  pumpId: string,
  records: PumpAuditRecord[],
): boolean {
  return records.some((r) => resolvePumpId(r.pump_id) === pumpId && r.is_completed === true);
}
