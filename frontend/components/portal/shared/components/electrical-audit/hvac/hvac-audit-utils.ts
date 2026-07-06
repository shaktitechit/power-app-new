import type { HVACAuditExcelParsed } from "@/components/portal/lib/electrical-audit/hvac-audit-excel";
import type { HVACAudit } from "@/store/slices/electrical-audit/hvacAuditApiSlice";

export type ChecklistItemState = {
  available: boolean;
  remarks: string;
};

export type EquipmentItemState = {
  equipment_name: string;
  type: string;
  capacity: string;
  power_rating_kW: string;
  quantity: string;
  remarks: string;
};

export type ChillerReadingState = {
  chiller_load_TR: string;
  power_input_kW: string;
  chilled_water_in_temp: string;
  chilled_water_out_temp: string;
  condenser_water_in_temp: string;
  condenser_water_out_temp: string;
};

export type AuxiliaryComponentState = {
  name: string;
  power_kW: string;
};

export type CoolingTowerReadingState = {
  inlet_temp: string;
  outlet_temp: string;
  ambient_temp: string;
};

export type ExistingDocument = {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
};

export type FacilityPrefill = {
  name?: string;
  address?: string;
  client_representative?: string;
  client_contact_number?: string;
  client_email?: string;
  facility_type?: string;
};

export type DocumentsRecordsState = {
  single_line_diagram_electrical: ChecklistItemState;
  hvac_layout_piping_drawing: ChecklistItemState;
  chiller_operation_maintenance_log: ChecklistItemState;
  water_treatment_records: ChecklistItemState;
  cooling_tower_maintenance_record: ChecklistItemState;
  hvac_equipment_capacity_list: ChecklistItemState;
  bms_setpoints_schedule: ChecklistItemState;
};

export type HVACAuditFormState = {
  id?: string;
  localId: string;
  isNew: boolean;

  pre_audit_information: {
    facility_name: string;
    location_address: string;
    client_contact_person: string;
    contact_number_email: string;
    type_of_facility: string;
    audit_dates: string[];
    auditor_team_members_names: string[];
    total_operating_hours_per_day: string;
    hvac_operating_hours_per_day: string;
    season_ambient_conditions: string;
  };

  documents_records_to_collect: DocumentsRecordsState;

  hvac_equipment_register: EquipmentItemState[];

  chiller_field_test: {
    readings: ChillerReadingState[];
    average: {
      avg_load_TR: string;
      avg_power_kW: string;
    };
  };

  auxiliary_power: {
    components: AuxiliaryComponentState[];
    total_auxiliary_power_used_kW: string;
  };

  cooling_tower_quick_test: {
    readings: CoolingTowerReadingState[];
    average: {
      avg_inlet_temp: string;
      avg_outlet_temp: string;
    };
  };

  summary: {
    average_cooling_produced_TR: string;
    average_chiller_power_used_kW: string;
    total_auxiliary_power_used_kW: string;
    total_plant_power_kW: string;
    plant_efficiency_kW_per_TR: string;
    coefficient_of_performance: string;
  };

  audit_date: string;
  auditor_id: string;

  existingDocuments: ExistingDocument[];
  newDocuments: File[];
};

export const editableInputClass =
  "border-input bg-background text-foreground focus:border-primary focus:ring-1 focus:ring-primary";

export const autoInputClass =
  "cursor-not-allowed border border-dashed border-sky-300 bg-sky-100 text-sky-900 opacity-100 dark:border-sky-700 dark:bg-sky-950/60 dark:text-sky-100";

export const getInputClass = (disabled: boolean) =>
  disabled ? autoInputClass : editableInputClass;

const createChecklistItem = (): ChecklistItemState => ({
  available: false,
  remarks: "",
});

const createDocumentsChecklist = (): DocumentsRecordsState => ({
  single_line_diagram_electrical: createChecklistItem(),
  hvac_layout_piping_drawing: createChecklistItem(),
  chiller_operation_maintenance_log: createChecklistItem(),
  water_treatment_records: createChecklistItem(),
  cooling_tower_maintenance_record: createChecklistItem(),
  hvac_equipment_capacity_list: createChecklistItem(),
  bms_setpoints_schedule: createChecklistItem(),
});

export const mergeDocumentsChecklist = (
  checklist?: Partial<DocumentsRecordsState> | null,
): DocumentsRecordsState => {
  const defaults = createDocumentsChecklist();

  return {
    single_line_diagram_electrical: {
      ...defaults.single_line_diagram_electrical,
      ...(checklist?.single_line_diagram_electrical || {}),
    },
    hvac_layout_piping_drawing: {
      ...defaults.hvac_layout_piping_drawing,
      ...(checklist?.hvac_layout_piping_drawing || {}),
    },
    chiller_operation_maintenance_log: {
      ...defaults.chiller_operation_maintenance_log,
      ...(checklist?.chiller_operation_maintenance_log || {}),
    },
    water_treatment_records: {
      ...defaults.water_treatment_records,
      ...(checklist?.water_treatment_records || {}),
    },
    cooling_tower_maintenance_record: {
      ...defaults.cooling_tower_maintenance_record,
      ...(checklist?.cooling_tower_maintenance_record || {}),
    },
    hvac_equipment_capacity_list: {
      ...defaults.hvac_equipment_capacity_list,
      ...(checklist?.hvac_equipment_capacity_list || {}),
    },
    bms_setpoints_schedule: {
      ...defaults.bms_setpoints_schedule,
      ...(checklist?.bms_setpoints_schedule || {}),
    },
  };
};

export const createEquipmentItem = (): EquipmentItemState => ({
  equipment_name: "",
  type: "",
  capacity: "",
  power_rating_kW: "",
  quantity: "",
  remarks: "",
});

export const createChillerReading = (): ChillerReadingState => ({
  chiller_load_TR: "",
  power_input_kW: "",
  chilled_water_in_temp: "",
  chilled_water_out_temp: "",
  condenser_water_in_temp: "",
  condenser_water_out_temp: "",
});

export const createAuxiliaryComponent = (): AuxiliaryComponentState => ({
  name: "",
  power_kW: "",
});

export const createCoolingTowerReading = (): CoolingTowerReadingState => ({
  inlet_temp: "",
  outlet_temp: "",
  ambient_temp: "",
});

const getFacilityContactValue = (facility?: FacilityPrefill) => {
  const phone = facility?.client_contact_number?.trim() || "";
  const email = facility?.client_email?.trim() || "";

  if (phone && email) return `${phone} / ${email}`;
  if (phone) return phone;
  if (email) return email;
  return "";
};

export const createEmptyForm = (facility?: FacilityPrefill): HVACAuditFormState => ({
  localId: `new-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  isNew: true,

  pre_audit_information: {
    facility_name: facility?.name || "",
    location_address: facility?.address || "",
    client_contact_person: facility?.client_representative || "",
    contact_number_email: getFacilityContactValue(facility),
    type_of_facility: facility?.facility_type || "",
    audit_dates: [""],
    auditor_team_members_names: [""],
    total_operating_hours_per_day: "",
    hvac_operating_hours_per_day: "",
    season_ambient_conditions: "",
  },

  documents_records_to_collect: createDocumentsChecklist(),

  hvac_equipment_register: [createEquipmentItem()],

  chiller_field_test: {
    readings: [createChillerReading()],
    average: {
      avg_load_TR: "",
      avg_power_kW: "",
    },
  },

  auxiliary_power: {
    components: [createAuxiliaryComponent()],
    total_auxiliary_power_used_kW: "",
  },

  cooling_tower_quick_test: {
    readings: [createCoolingTowerReading()],
    average: {
      avg_inlet_temp: "",
      avg_outlet_temp: "",
    },
  },

  summary: {
    average_cooling_produced_TR: "",
    average_chiller_power_used_kW: "",
    total_auxiliary_power_used_kW: "",
    total_plant_power_kW: "",
    plant_efficiency_kW_per_TR: "",
    coefficient_of_performance: "",
  },

  audit_date: "",
  auditor_id: "",

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

const toStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length === 0) return [""];
  return value.map((item) => toStringValue(item));
};

export function auditToForm(record: any): HVACAuditFormState {
  return {
    id: record._id,
    localId: record._id,
    isNew: false,

    pre_audit_information: {
      facility_name: record.pre_audit_information?.facility_name || "",
      location_address: record.pre_audit_information?.location_address || "",
      client_contact_person:
        record.pre_audit_information?.client_contact_person || "",
      contact_number_email:
        record.pre_audit_information?.contact_number_email || "",
      type_of_facility: record.pre_audit_information?.type_of_facility || "",
      audit_dates: toStringArray(
        record.pre_audit_information?.audit_dates?.map((d: string) =>
          toDateInput(d),
        ),
      ),
      auditor_team_members_names: toStringArray(
        record.pre_audit_information?.auditor_team_members_names,
      ),
      total_operating_hours_per_day: toStringValue(
        record.pre_audit_information?.total_operating_hours_per_day,
      ),
      hvac_operating_hours_per_day: toStringValue(
        record.pre_audit_information?.hvac_operating_hours_per_day,
      ),
      season_ambient_conditions:
        record.pre_audit_information?.season_ambient_conditions || "",
    },

    documents_records_to_collect: mergeDocumentsChecklist(
      record.documents_records_to_collect,
    ),

    hvac_equipment_register:
      record.hvac_equipment_register?.length > 0
        ? record.hvac_equipment_register.map((item: any) => ({
            equipment_name: item.equipment_name || "",
            type: item.type || "",
            capacity: toStringValue(item.capacity),
            power_rating_kW: toStringValue(item.power_rating_kW),
            quantity: toStringValue(item.quantity),
            remarks: item.remarks || "",
          }))
        : [createEquipmentItem()],

    chiller_field_test: {
      readings:
        record.chiller_field_test?.readings?.length > 0
          ? record.chiller_field_test.readings.map((item: any) => ({
              chiller_load_TR: toStringValue(item.chiller_load_TR),
              power_input_kW: toStringValue(item.power_input_kW),
              chilled_water_in_temp: toStringValue(item.chilled_water_in_temp),
              chilled_water_out_temp: toStringValue(
                item.chilled_water_out_temp,
              ),
              condenser_water_in_temp: toStringValue(
                item.condenser_water_in_temp,
              ),
              condenser_water_out_temp: toStringValue(
                item.condenser_water_out_temp,
              ),
            }))
          : [createChillerReading()],
      average: {
        avg_load_TR: toStringValue(
          record.chiller_field_test?.average?.avg_load_TR,
        ),
        avg_power_kW: toStringValue(
          record.chiller_field_test?.average?.avg_power_kW,
        ),
      },
    },

    auxiliary_power: {
      components:
        record.auxiliary_power?.components?.length > 0
          ? record.auxiliary_power.components.map((item: any) => ({
              name: item.name || "",
              power_kW: toStringValue(item.power_kW),
            }))
          : [createAuxiliaryComponent()],
      total_auxiliary_power_used_kW: toStringValue(
        record.auxiliary_power?.total_auxiliary_power_used_kW,
      ),
    },

    cooling_tower_quick_test: {
      readings:
        record.cooling_tower_quick_test?.readings?.length > 0
          ? record.cooling_tower_quick_test.readings.map((item: any) => ({
              inlet_temp: toStringValue(item.inlet_temp),
              outlet_temp: toStringValue(item.outlet_temp),
              ambient_temp: toStringValue(item.ambient_temp),
            }))
          : [createCoolingTowerReading()],
      average: {
        avg_inlet_temp: toStringValue(
          record.cooling_tower_quick_test?.average?.avg_inlet_temp,
        ),
        avg_outlet_temp: toStringValue(
          record.cooling_tower_quick_test?.average?.avg_outlet_temp,
        ),
      },
    },

    summary: {
      average_cooling_produced_TR: toStringValue(
        record.summary?.average_cooling_produced_TR,
      ),
      average_chiller_power_used_kW: toStringValue(
        record.summary?.average_chiller_power_used_kW,
      ),
      total_auxiliary_power_used_kW: toStringValue(
        record.summary?.total_auxiliary_power_used_kW,
      ),
      total_plant_power_kW: toStringValue(record.summary?.total_plant_power_kW),
      plant_efficiency_kW_per_TR: toStringValue(
        record.summary?.plant_efficiency_kW_per_TR,
      ),
      coefficient_of_performance: toStringValue(
        record.summary?.coefficient_of_performance,
      ),
    },

    audit_date: toDateInput(record.audit_date),
    auditor_id: record.auditor_id?._id || record.auditor_id || "",

    existingDocuments: record.documents || [],
    newDocuments: [],
  };
}

const toNumber = (value: string) => {
  if (!value || value.trim() === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

const averageOf = (values: string[]) => {
  const nums = values
    .map((item) => Number(item))
    .filter((num) => !Number.isNaN(num) && num > 0);

  if (nums.length === 0) return "";
  return String(
    Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2)),
  );
};

export const updateComputedValues = (form: HVACAuditFormState): HVACAuditFormState => {
  const avgLoad = averageOf(
    form.chiller_field_test.readings.map((r) => r.chiller_load_TR),
  );
  const avgPower = averageOf(
    form.chiller_field_test.readings.map((r) => r.power_input_kW),
  );
  const avgInlet = averageOf(
    form.cooling_tower_quick_test.readings.map((r) => r.inlet_temp),
  );
  const avgOutlet = averageOf(
    form.cooling_tower_quick_test.readings.map((r) => r.outlet_temp),
  );

  const auxTotal = form.auxiliary_power.components
    .map((c) => Number(c.power_kW))
    .filter((n) => !Number.isNaN(n))
    .reduce((sum, n) => sum + n, 0);

  const avgLoadNum = toNumber(avgLoad);
  const avgPowerNum = toNumber(avgPower);
  const auxTotalNum = auxTotal || 0;

  const totalPlantPower =
    avgPowerNum !== undefined
      ? Number((avgPowerNum + auxTotalNum).toFixed(2))
      : undefined;

  const plantEfficiency =
    totalPlantPower !== undefined && avgLoadNum !== undefined && avgLoadNum > 0
      ? Number((totalPlantPower / avgLoadNum).toFixed(2))
      : undefined;

  const cop =
    avgPowerNum !== undefined && avgPowerNum > 0 && avgLoadNum !== undefined
      ? Number(((avgLoadNum * 3.517) / avgPowerNum).toFixed(2))
      : undefined;

  return {
    ...form,
    documents_records_to_collect: mergeDocumentsChecklist(
      form.documents_records_to_collect,
    ),
    chiller_field_test: {
      ...form.chiller_field_test,
      average: {
        avg_load_TR: avgLoad,
        avg_power_kW: avgPower,
      },
    },
    auxiliary_power: {
      ...form.auxiliary_power,
      total_auxiliary_power_used_kW:
        auxTotal > 0 ? String(Number(auxTotal.toFixed(2))) : "",
    },
    cooling_tower_quick_test: {
      ...form.cooling_tower_quick_test,
      average: {
        avg_inlet_temp: avgInlet,
        avg_outlet_temp: avgOutlet,
      },
    },
    summary: {
      ...form.summary,
      average_cooling_produced_TR: avgLoad,
      average_chiller_power_used_kW: avgPower,
      total_auxiliary_power_used_kW:
        auxTotal > 0 ? String(Number(auxTotal.toFixed(2))) : "",
      total_plant_power_kW:
        totalPlantPower !== undefined ? String(totalPlantPower) : "",
      plant_efficiency_kW_per_TR:
        plantEfficiency !== undefined ? String(plantEfficiency) : "",
      coefficient_of_performance: cop !== undefined ? String(cop) : "",
    },
  };
};

export function applyHVACExcelParsed(
  form: HVACAuditFormState,
  parsed: HVACAuditExcelParsed,
): HVACAuditFormState {
  let next: HVACAuditFormState = { ...form };

  if (parsed.audit_date !== undefined) {
    next = { ...next, audit_date: parsed.audit_date };
  }

  if (parsed.pre_audit_information) {
    const p = parsed.pre_audit_information;
    next = {
      ...next,
      pre_audit_information: {
        ...next.pre_audit_information,
        ...p,
        audit_dates:
          p.audit_dates !== undefined
            ? p.audit_dates
            : next.pre_audit_information.audit_dates,
        auditor_team_members_names:
          p.auditor_team_members_names !== undefined
            ? p.auditor_team_members_names
            : next.pre_audit_information.auditor_team_members_names,
      },
    };
  }

  if (parsed.documents_records_to_collect) {
    const merged = { ...next.documents_records_to_collect };
    for (const [k, v] of Object.entries(parsed.documents_records_to_collect)) {
      const key = k as keyof DocumentsRecordsState;
      if (!v) continue;
      merged[key] = {
        available:
          v.available !== undefined
            ? v.available
            : merged[key].available,
        remarks:
          v.remarks !== undefined ? v.remarks : merged[key].remarks,
      };
    }
    next = {
      ...next,
      documents_records_to_collect: mergeDocumentsChecklist(merged),
    };
  }

  if (parsed.hvac_equipment_register !== undefined) {
    next.hvac_equipment_register =
      parsed.hvac_equipment_register.length > 0
        ? parsed.hvac_equipment_register
        : [createEquipmentItem()];
  }

  if (parsed.chiller_field_test?.readings !== undefined) {
    next.chiller_field_test = {
      ...next.chiller_field_test,
      readings:
        parsed.chiller_field_test.readings.length > 0
          ? parsed.chiller_field_test.readings
          : [createChillerReading()],
    };
  }

  if (parsed.auxiliary_power?.components !== undefined) {
    next.auxiliary_power = {
      ...next.auxiliary_power,
      components:
        parsed.auxiliary_power.components.length > 0
          ? parsed.auxiliary_power.components
          : [createAuxiliaryComponent()],
    };
  }

  if (parsed.cooling_tower_quick_test?.readings !== undefined) {
    next.cooling_tower_quick_test = {
      ...next.cooling_tower_quick_test,
      readings:
        parsed.cooling_tower_quick_test.readings.length > 0
          ? parsed.cooling_tower_quick_test.readings
          : [createCoolingTowerReading()],
    };
  }

  if (parsed.summary) {
    next = {
      ...next,
      summary: { ...next.summary, ...parsed.summary },
    };
  }

  return updateComputedValues(next);
}

export function formatDisplayValue(value?: string | number | null | boolean) {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

export const CHECKLIST_FIELDS: {
  key: keyof DocumentsRecordsState;
  label: string;
}[] = [
  { key: "single_line_diagram_electrical", label: "Single Line Diagram Electrical" },
  { key: "hvac_layout_piping_drawing", label: "HVAC Layout / Piping Drawing" },
  { key: "chiller_operation_maintenance_log", label: "Chiller Operation & Maintenance Log" },
  { key: "water_treatment_records", label: "Water Treatment Records" },
  { key: "cooling_tower_maintenance_record", label: "Cooling Tower Maintenance Record" },
  { key: "hvac_equipment_capacity_list", label: "HVAC Equipment Capacity List" },
  { key: "bms_setpoints_schedule", label: "BMS Setpoints Schedule" },
];

export function buildHVACAuditPayload(
  form: HVACAuditFormState,
  facilityId: string,
  utilityAccountId: string,
) {
  const mergedChecklist = mergeDocumentsChecklist(form.documents_records_to_collect);
  const toNumber = (value: string) => {
    if (!value || value.trim() === "") return undefined;
    const num = Number(value);
    return Number.isNaN(num) ? undefined : num;
  };

  return {
    facility_id: facilityId,
    utility_account_id: utilityAccountId,
    pre_audit_information: {
      ...form.pre_audit_information,
      audit_dates: form.pre_audit_information.audit_dates.filter(Boolean),
      auditor_team_members_names:
        form.pre_audit_information.auditor_team_members_names.filter(Boolean),
      total_operating_hours_per_day: toNumber(
        form.pre_audit_information.total_operating_hours_per_day,
      ),
      hvac_operating_hours_per_day: toNumber(
        form.pre_audit_information.hvac_operating_hours_per_day,
      ),
    },
    documents_records_to_collect: mergedChecklist,
    hvac_equipment_register: form.hvac_equipment_register.map((item) => ({
      equipment_name: item.equipment_name || undefined,
      type: item.type || undefined,
      capacity: toNumber(item.capacity),
      power_rating_kW: toNumber(item.power_rating_kW),
      quantity: toNumber(item.quantity),
      remarks: item.remarks || undefined,
    })),
    chiller_field_test: {
      readings: form.chiller_field_test.readings.map((item) => ({
        chiller_load_TR: toNumber(item.chiller_load_TR),
        power_input_kW: toNumber(item.power_input_kW),
        chilled_water_in_temp: toNumber(item.chilled_water_in_temp),
        chilled_water_out_temp: toNumber(item.chilled_water_out_temp),
        condenser_water_in_temp: toNumber(item.condenser_water_in_temp),
        condenser_water_out_temp: toNumber(item.condenser_water_out_temp),
      })),
      average: {
        avg_load_TR: toNumber(form.chiller_field_test.average.avg_load_TR),
        avg_power_kW: toNumber(form.chiller_field_test.average.avg_power_kW),
      },
    },
    auxiliary_power: {
      components: form.auxiliary_power.components.map((item) => ({
        name: item.name || undefined,
        power_kW: toNumber(item.power_kW),
      })),
      total_auxiliary_power_used_kW: toNumber(
        form.auxiliary_power.total_auxiliary_power_used_kW,
      ),
    },
    cooling_tower_quick_test: {
      readings: form.cooling_tower_quick_test.readings.map((item) => ({
        inlet_temp: toNumber(item.inlet_temp),
        outlet_temp: toNumber(item.outlet_temp),
        ambient_temp: toNumber(item.ambient_temp),
      })),
      average: {
        avg_inlet_temp: toNumber(form.cooling_tower_quick_test.average.avg_inlet_temp),
        avg_outlet_temp: toNumber(form.cooling_tower_quick_test.average.avg_outlet_temp),
      },
    },
    summary: {
      average_cooling_produced_TR: toNumber(form.summary.average_cooling_produced_TR),
      average_chiller_power_used_kW: toNumber(form.summary.average_chiller_power_used_kW),
      total_auxiliary_power_used_kW: toNumber(form.summary.total_auxiliary_power_used_kW),
      total_plant_power_kW: toNumber(form.summary.total_plant_power_kW),
      plant_efficiency_kW_per_TR: toNumber(form.summary.plant_efficiency_kW_per_TR),
      coefficient_of_performance: toNumber(form.summary.coefficient_of_performance),
    },
    audit_date: form.audit_date || undefined,
    auditor_id: form.auditor_id || undefined,
  };
}

export function sortHVACAuditsStable(records: HVACAudit[]): HVACAudit[] {
  return [...records].sort((a, b) => {
    const ta = Date.parse(a.audit_date ?? a.created_at ?? a.createdAt ?? "");
    const tb = Date.parse(b.audit_date ?? b.created_at ?? b.createdAt ?? "");
    if (!Number.isNaN(ta) && !Number.isNaN(tb) && ta !== tb) return tb - ta;
    return String(b._id).localeCompare(String(a._id));
  });
}

export function getHVACAuditTabLabel(index: number) {
  return `HVAC ${index + 1}`;
}

export function updateHVACForm(
  form: HVACAuditFormState,
  updater: (form: HVACAuditFormState) => HVACAuditFormState,
): HVACAuditFormState {
  return updateComputedValues(updater(form));
}
