import type { ACAuditRecord, CreateACAuditRequest } from "@/store/slices/electrical-audit/acAuditRecordApiSlice";

export type ExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  uploadedAt?: string;
};

export type ACAuditFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  unit_id: string;
  building_block: string;
  area_location: string;
  ac_type: "window" | "split" | "ductable" | "";
  make: string;
  model: string;
  cooling_capacity_TR: string;
  rated_input_power_kW: string;
  bee_star_rating: string;
  refrigerant: string;
  year_of_installation: string;
  control_type:
    | "manual"
    | "thermostat"
    | "bms"
    | "timer"
    | "inverter"
    | "other"
    | "";
  quantity_nos: string;
  running_status: "running" | "not_running" | "standby" | "";
  condition: "good" | "average" | "poor" | "";
  remarks: string;

  voltage_V: string;
  current_A: string;
  power_factor: string;
  measured_power_kW: string;
  return_air_temp_C: string;
  supply_air_temp_C: string;
  ambient_temp_C: string;
  thermostat_set_temp_C: string;
  operating_hours_per_day: string;
  operating_days_per_year: string;
  compressor_fan_cycling: "normal" | "frequent" | "continuous" | "";
  filter_evaporator_condition: "clean" | "moderate" | "dirty" | "";
  condenser_condition: "clean" | "moderate" | "dirty" | "";
  airflow_noise_leakage: string;
  measurement_remarks: string;

  airside_delta_T: string;
  loading_factor_percent: string;
  connected_load_kW: string;
  annual_energy_consumption_kWh: string;
  specific_power_kW_per_TR: string;
  age_years: string;
  om_flag: string;
  replacement_flag: string; // yes / no
  control_flag: string;
  overall_ecm_suggestion: string;
  priority: "low" | "medium" | "high" | "";
  indicative_basis: string;

  audit_date: string;

  existingDocuments: ExistingDocument[];
  newDocuments: File[];
};

export const editableInputClass =
  "border-input bg-background text-foreground placeholder:text-muted-foreground";
export const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

export const createEmptyForm = (): ACAuditFormState => ({
  localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  isNew: true,

  unit_id: "",
  building_block: "",
  area_location: "",
  ac_type: "",
  make: "",
  model: "",
  cooling_capacity_TR: "",
  rated_input_power_kW: "",
  bee_star_rating: "",
  refrigerant: "",
  year_of_installation: "",
  control_type: "",
  quantity_nos: "1",
  running_status: "running",
  condition: "",
  remarks: "",

  voltage_V: "",
  current_A: "",
  power_factor: "",
  measured_power_kW: "",
  return_air_temp_C: "",
  supply_air_temp_C: "",
  ambient_temp_C: "",
  thermostat_set_temp_C: "",
  operating_hours_per_day: "",
  operating_days_per_year: "",
  compressor_fan_cycling: "",
  filter_evaporator_condition: "",
  condenser_condition: "",
  airflow_noise_leakage: "",
  measurement_remarks: "",

  airside_delta_T: "",
  loading_factor_percent: "",
  connected_load_kW: "",
  annual_energy_consumption_kWh: "",
  specific_power_kW_per_TR: "",
  age_years: "",
  om_flag: "",
  replacement_flag: "",
  control_flag: "",
  overall_ecm_suggestion: "",
  priority: "",
  indicative_basis: "",

  audit_date: "",

  existingDocuments: [],
  newDocuments: [],
});

export function toDateInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().split("T")[0];
}

const toStringValue = (value: unknown) =>
  value === undefined || value === null ? "" : String(value);

const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const round2 = (num: number) => Number(num.toFixed(2));

const normalizeObjectId = (value: any): string => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return "";
};

export const updateComputedValues = (form: ACAuditFormState): ACAuditFormState => {
  const returnAir = toNumber(form.return_air_temp_C);
  const supplyAir = toNumber(form.supply_air_temp_C);
  const measuredPower = toNumber(form.measured_power_kW);
  const quantity = toNumber(form.quantity_nos);
  const operatingHours = toNumber(form.operating_hours_per_day);
  const operatingDays = toNumber(form.operating_days_per_year);
  const coolingTR = toNumber(form.cooling_capacity_TR);
  const ratedPower = toNumber(form.rated_input_power_kW);
  const installationYear = toNumber(form.year_of_installation);

  const airsideDeltaT =
    returnAir !== undefined && supplyAir !== undefined
      ? round2(returnAir - supplyAir)
      : undefined;

  const loadingFactor =
    measuredPower !== undefined && ratedPower !== undefined && ratedPower > 0
      ? round2((measuredPower / ratedPower) * 100)
      : undefined;

  const connectedLoad =
    ratedPower !== undefined && quantity !== undefined
      ? round2(ratedPower * quantity)
      : undefined;

  const annualEnergy =
    measuredPower !== undefined &&
    quantity !== undefined &&
    operatingHours !== undefined &&
    operatingDays !== undefined
      ? round2(measuredPower * quantity * operatingHours * operatingDays)
      : undefined;

  const specificPower =
    measuredPower !== undefined && coolingTR !== undefined && coolingTR > 0
      ? round2(measuredPower / coolingTR)
      : undefined;

  const ageYears =
    installationYear !== undefined
      ? new Date().getFullYear() - installationYear
      : undefined;

  const hasOMIssue =
    form.filter_evaporator_condition === "moderate" ||
    form.filter_evaporator_condition === "dirty" ||
    form.condenser_condition === "moderate" ||
    form.condenser_condition === "dirty" ||
    (airsideDeltaT !== undefined && airsideDeltaT < 8);

  const omFlag = hasOMIssue
    ? "Clean filter/coils; check airflow and refrigerant charge"
    : "No major O&M flag";

  const replacementNeeded =
    ageYears !== undefined &&
    specificPower !== undefined &&
    ageYears >= 10 &&
    specificPower > 1.35;

  const replacementFlag = replacementNeeded ? "yes" : "no";

  const replacementSuggestion = replacementNeeded
    ? "Consider replacement with BEE 5-star inverter AC"
    : "";

  const controlFlag =
    form.control_type === "manual" ||
    form.control_type === "thermostat" ||
    !form.control_type
      ? "Review setpoint, scheduling, timer or inverter control"
      : "Control appears acceptable";

  const overallSuggestion = replacementSuggestion
    ? replacementSuggestion
    : omFlag !== "No major O&M flag"
      ? omFlag
      : controlFlag !== "Control appears acceptable"
        ? controlFlag
        : "Maintain and monitor performance";

  const priority: ACAuditFormState["priority"] = replacementNeeded
    ? "high"
    : omFlag !== "No major O&M flag" ||
        controlFlag !== "Control appears acceptable"
      ? "medium"
      : "low";

  let indicativeBasis = "";

  if (airsideDeltaT !== undefined && airsideDeltaT < 8) {
    indicativeBasis = "Low ΔT or dirty heat exchange surfaces";
  } else if (replacementNeeded) {
    indicativeBasis = "Old unit with high specific power";
  } else if (
    form.filter_evaporator_condition === "moderate" ||
    form.filter_evaporator_condition === "dirty" ||
    form.condenser_condition === "moderate" ||
    form.condenser_condition === "dirty"
  ) {
    indicativeBasis = "Dirty heat exchange surfaces";
  } else if (form.unit_id) {
    indicativeBasis = "Standard performance";
  }

  return {
    ...form,
    airside_delta_T: airsideDeltaT !== undefined ? String(airsideDeltaT) : "",
    loading_factor_percent:
      loadingFactor !== undefined ? String(loadingFactor) : "",
    connected_load_kW: connectedLoad !== undefined ? String(connectedLoad) : "",
    annual_energy_consumption_kWh:
      annualEnergy !== undefined ? String(annualEnergy) : "",
    specific_power_kW_per_TR:
      specificPower !== undefined ? String(specificPower) : "",
    age_years: ageYears !== undefined ? String(ageYears) : "",
    om_flag: form.unit_id ? omFlag : "",
    replacement_flag: form.unit_id ? replacementFlag : "",
    control_flag: form.unit_id ? controlFlag : "",
    overall_ecm_suggestion: form.unit_id ? overallSuggestion : "",
    priority: form.unit_id ? priority : "",
    indicative_basis: form.unit_id ? indicativeBasis : "",
  };
};

export function auditToForm(record: any): ACAuditFormState {
  const form: ACAuditFormState = {
    id: record._id,
    localId: record._id,
    isNew: false,

    unit_id: toStringValue(record.unit_id),
    building_block: toStringValue(record.building_block),
    area_location: toStringValue(record.area_location),
    ac_type: (record.ac_type || "") as ACAuditFormState["ac_type"],
    make: toStringValue(record.make),
    model: toStringValue(record.model),
    cooling_capacity_TR: toStringValue(record.cooling_capacity_TR),
    rated_input_power_kW: toStringValue(record.rated_input_power_kW),
    bee_star_rating: toStringValue(record.bee_star_rating),
    refrigerant: toStringValue(record.refrigerant),
    year_of_installation: toStringValue(record.year_of_installation),
    control_type: (record.control_type ||
      "") as ACAuditFormState["control_type"],
    quantity_nos: toStringValue(record.quantity_nos || 1),
    running_status: (record.running_status ||
      "") as ACAuditFormState["running_status"],
    condition: (record.condition || "") as ACAuditFormState["condition"],
    remarks: toStringValue(record.remarks),

    voltage_V: toStringValue(record.voltage_V),
    current_A: toStringValue(record.current_A),
    power_factor: toStringValue(record.power_factor),
    measured_power_kW: toStringValue(record.measured_power_kW),
    return_air_temp_C: toStringValue(record.return_air_temp_C),
    supply_air_temp_C: toStringValue(record.supply_air_temp_C),
    ambient_temp_C: toStringValue(record.ambient_temp_C),
    thermostat_set_temp_C: toStringValue(record.thermostat_set_temp_C),
    operating_hours_per_day: toStringValue(record.operating_hours_per_day),
    operating_days_per_year: toStringValue(record.operating_days_per_year),
    compressor_fan_cycling: (record.compressor_fan_cycling ||
      "") as ACAuditFormState["compressor_fan_cycling"],
    filter_evaporator_condition: (record.filter_evaporator_condition ||
      "") as ACAuditFormState["filter_evaporator_condition"],
    condenser_condition: (record.condenser_condition ||
      "") as ACAuditFormState["condenser_condition"],
    airflow_noise_leakage: toStringValue(record.airflow_noise_leakage),
    measurement_remarks: toStringValue(record.measurement_remarks),

    airside_delta_T: toStringValue(record.airside_delta_T),
    loading_factor_percent: toStringValue(record.loading_factor_percent),
    connected_load_kW: toStringValue(record.connected_load_kW),
    annual_energy_consumption_kWh: toStringValue(
      record.annual_energy_consumption_kWh,
    ),
    specific_power_kW_per_TR: toStringValue(record.specific_power_kW_per_TR),
    age_years: toStringValue(record.age_years),
    om_flag: toStringValue(record.om_flag),
    replacement_flag: toStringValue(record.replacement_flag),
    control_flag: toStringValue(record.control_flag),
    overall_ecm_suggestion: toStringValue(record.overall_ecm_suggestion),
    priority: (record.priority || "") as ACAuditFormState["priority"],
    indicative_basis: toStringValue(record.indicative_basis),

    audit_date: toDateInput(record.audit_date),

    existingDocuments: Array.isArray(record.documents) ? record.documents : [],
    newDocuments: [],
  };

  return updateComputedValues(form);
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export function buildACAuditPayload(
  form: ACAuditFormState,
  facilityId: string,
  utilityAccountId: string,
): CreateACAuditRequest {
  const pf = toNumber(form.power_factor);
  const safePowerFactor =
    pf !== undefined ? Math.min(Math.max(pf, 0), 1) : undefined;

  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    unit_id: form.unit_id.trim(),
    building_block: form.building_block || undefined,
    area_location: form.area_location || undefined,
    ac_type: form.ac_type || undefined,
    make: form.make || undefined,
    model: form.model || undefined,
    cooling_capacity_TR: toNumber(form.cooling_capacity_TR),
    rated_input_power_kW: toNumber(form.rated_input_power_kW),
    bee_star_rating: toNumber(form.bee_star_rating),
    refrigerant: form.refrigerant || undefined,
    year_of_installation: toNumber(form.year_of_installation),
    control_type: form.control_type || undefined,
    quantity_nos: toNumber(form.quantity_nos),
    running_status: form.running_status || undefined,
    condition: form.condition || undefined,
    remarks: form.remarks || undefined,
    voltage_V: toNumber(form.voltage_V),
    current_A: toNumber(form.current_A),
    power_factor: safePowerFactor,
    measured_power_kW: toNumber(form.measured_power_kW),
    return_air_temp_C: toNumber(form.return_air_temp_C),
    supply_air_temp_C: toNumber(form.supply_air_temp_C),
    ambient_temp_C: toNumber(form.ambient_temp_C),
    thermostat_set_temp_C: toNumber(form.thermostat_set_temp_C),
    operating_hours_per_day: toNumber(form.operating_hours_per_day),
    operating_days_per_year: toNumber(form.operating_days_per_year),
    compressor_fan_cycling: form.compressor_fan_cycling || undefined,
    filter_evaporator_condition: form.filter_evaporator_condition || undefined,
    condenser_condition: form.condenser_condition || undefined,
    airflow_noise_leakage: form.airflow_noise_leakage || undefined,
    measurement_remarks: form.measurement_remarks || undefined,
    airside_delta_T: toNumber(form.airside_delta_T),
    loading_factor_percent: toNumber(form.loading_factor_percent),
    connected_load_kW: toNumber(form.connected_load_kW),
    annual_energy_consumption_kWh: toNumber(form.annual_energy_consumption_kWh),
    specific_power_kW_per_TR: toNumber(form.specific_power_kW_per_TR),
    age_years: toNumber(form.age_years),
    om_flag: form.om_flag || undefined,
    replacement_flag:
      form.replacement_flag === "yes" || form.replacement_flag === "no"
        ? form.replacement_flag
        : undefined,
    control_flag: form.control_flag || undefined,
    overall_ecm_suggestion: form.overall_ecm_suggestion || undefined,
    priority:
      form.priority === "low" ||
      form.priority === "medium" ||
      form.priority === "high"
        ? form.priority
        : undefined,
    indicative_basis: form.indicative_basis || undefined,
    audit_date: form.audit_date || undefined,
  };
}

export function sortACAuditRecordsStable(records: ACAuditRecord[]): ACAuditRecord[] {
  return [...records].sort((a, b) => {
    const ta = Date.parse(a.audit_date ?? a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.audit_date ?? b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getACAuditTabLabel(record: ACAuditRecord, index: number) {
  const unitId = record.unit_id?.trim();
  const prefix = `AC ${index + 1}`;
  return unitId ? `${prefix} (${unitId})` : prefix;
}

export function updateACAuditForm(
  form: ACAuditFormState,
  updater: (form: ACAuditFormState) => ACAuditFormState,
): ACAuditFormState {
  return updateComputedValues(updater(form));
}

export function applyACAuditExcelParsed(
  form: ACAuditFormState,
  parsed: Record<string, unknown>,
): ACAuditFormState {
  const next = { ...form } as ACAuditFormState;
  const mutable = next as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(parsed)) {
    if (v === undefined) continue;
    mutable[k] = v;
  }
  return updateComputedValues(next);
}
