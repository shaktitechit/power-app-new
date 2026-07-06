import { apiSlice } from "../apiSlice";

export interface UPSAuditDocument {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  caption?: string;
  uploadedAt?: string;
}

export interface UPSAuditRecord {
  _id: string;
  facility_id: string;
  utility_account_id: string;

  // 1. NAMEPLATE & IDENTIFICATION
  ups_tag_asset_id?: string;
  make_model?: string;
  year_of_manufacture_installation?: string;
  technology_type?: string;
  input_phases?: "1-Phase" | "3-Phase";
  output_phases?: "1-Phase" | "3-Phase";
  rated_capacity_kVA?: number | string;
  rated_output_power_kW?: number | string;
  rated_input_voltage_LL?: number | string;
  rated_input_current_A?: number | string;
  rated_output_voltage_LL?: number | string;
  rated_input_frequency_Hz?: number | string;
  rated_output_power_factor?: number | string;
  standard_compliance?: string;
  bee_star_rating?: number | string;

  // 2. ELECTRICAL MEASUREMENTS — INPUT SIDE
  input_voltage_R?: number | string;
  input_voltage_Y?: number | string;
  input_voltage_B?: number | string;
  input_current_R?: number | string;
  input_current_Y?: number | string;
  input_current_B?: number | string;
  input_active_power_kW?: number | string;
  input_apparent_power_kVA?: number | string;
  input_reactive_power_kVAR?: number | string;
  input_power_factor?: number | string;
  input_frequency_Hz?: number | string;
  input_voltage_thd_R?: number | string;
  input_voltage_thd_Y?: number | string;
  input_voltage_thd_B?: number | string;
  input_current_thd_R?: number | string;
  input_current_thd_Y?: number | string;
  input_current_thd_B?: number | string;

  // 3. ELECTRICAL MEASUREMENTS — OUTPUT SIDE
  output_voltage_R?: number | string;
  output_voltage_Y?: number | string;
  output_voltage_B?: number | string;
  output_current_R?: number | string;
  output_current_Y?: number | string;
  output_current_B?: number | string;
  output_active_power_kW?: number | string;
  output_apparent_power_kVA?: number | string;
  output_power_factor?: number | string;
  output_frequency_Hz?: number | string;
  output_voltage_thd_R?: number | string;
  output_voltage_thd_Y?: number | string;
  output_voltage_thd_B?: number | string;

  // 4. LOADING & ENERGY CONSUMPTION
  loading_kVA_percent?: number | string;
  loading_kW_percent?: number | string;
  working_hours_per_day?: number | string;
  working_days_per_year?: number | string;
  load_factor?: number | string;
  annual_input_energy_kWh?: number | string;
  annual_output_energy_kWh?: number | string;
  annual_energy_loss_kWh?: number | string;
  annual_co2_emission_t?: number | string;

  // 5. EFFICIENCY BENCHMARKING
  measured_efficiency_percent?: number | string;
  nameplate_efficiency_100_percent?: number | string;
  nameplate_efficiency_75_percent?: number | string;
  nameplate_efficiency_50_percent?: number | string;
  nameplate_efficiency_25_percent?: number | string;
  efficiency_deviation_percentage_points?: number | string;
  measured_losses_kW?: number | string;

  // 6. BATTERY SYSTEM
  battery_type?: string;
  battery_strings_count?: number | string;
  battery_cells_per_string?: number | string;
  rated_battery_bank_voltage_V?: number | string;
  rated_ah_capacity?: number | string;
  float_charge_voltage_V?: number | string;
  float_charge_current_A?: number | string;
  float_charge_power_W?: number | string;
  cell_voltage_min?: number | string;
  cell_voltage_max?: number | string;
  cell_voltage_mean?: number | string;
  cell_voltage_imbalance_V?: number | string;
  battery_internal_resistance_mOhm?: number | string;
  battery_temp_ambient?: number | string;
  battery_temp_hottest_cell?: number | string;
  actual_backup_time_min?: number | string;
  rated_backup_time_full_load_min?: number | string;
  battery_age_years?: string;
  battery_health_assessment?: string;

  // 7. THERMAL & OPERATIONAL DATA
  ups_room_temp_C?: number | string;
  ups_room_humidity_percent?: number | string;
  ups_surface_temp_front_C?: number | string;
  ups_surface_temp_rear_C?: number | string;
  hotspot_temperature_C?: number | string;
  hotspot_location?: string;
  cooling_fan_status?: string;
  operational_mode?: string;
  transfer_time_ms?: number | string;
  operating_hours_total?: number | string;
  last_preventive_maintenance_date?: string;
  snmp_card_installed?: boolean;
  bypass_trips_12m?: number | string;
  input_submeter_installed?: boolean;

  remarks?: string;
  audit_date?: string;
  auditor_id?: string;

  documents: UPSAuditDocument[];
  is_completed?: boolean;

  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUPSAuditRequest extends Partial<Omit<UPSAuditRecord, "_id" | "documents">> {
  facility_id: string;
  utility_account_id: string;
  documents?: File[];
  existing_documents?: UPSAuditDocument[];
}

export interface UpdateUPSAuditRequest extends Partial<Omit<UPSAuditRecord, "_id" | "documents">> {
  id: string;
  documents?: File[];
  existing_documents?: UPSAuditDocument[];
}

export interface CreateUPSAuditResponse {
  success: boolean;
  message?: string;
  data: UPSAuditRecord;
}

export interface GetUPSAuditRecordsResponse {
  success: boolean;
  count: number;
  data: UPSAuditRecord[];
}

export interface GetUPSAuditRecordByIdResponse {
  success: boolean;
  data: UPSAuditRecord;
}

export interface UpdateUPSAuditResponse {
  success: boolean;
  message?: string;
  data: UPSAuditRecord;
}

export interface DeleteUPSAuditResponse {
  success: boolean;
  message: string;
}

const buildUPSAuditFormData = (
  data: Partial<CreateUPSAuditRequest | UpdateUPSAuditRequest>
) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (key === "documents") {
      const files = value as File[];
      files.forEach((file) => formData.append("documents", file));
    } else if (key === "existing_documents") {
      formData.append("existing_documents", JSON.stringify(value));
    } else if (typeof value === "boolean") {
      formData.append(key, String(value));
    } else {
      formData.append(key, String(value));
    }
  });

  return formData;
};

export const upsAuditApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createUPSAudit: builder.mutation<
      CreateUPSAuditResponse,
      CreateUPSAuditRequest
    >({
      query: (data) => ({
        url: "/v1/ups-audits",
        method: "POST",
        body: buildUPSAuditFormData(data),
      }),
      invalidatesTags: ["UPSAudit", "UtilityAccount", "Facility"],
    }),

    getUPSAudits: builder.query<
      GetUPSAuditRecordsResponse,
      { facility_id?: string; utility_account_id?: string } | void
    >({
      query: (params) => ({
        url: "/v1/ups-audits",
        method: "GET",
        params: {
          ...(params?.facility_id ? { facility_id: params.facility_id } : {}),
          ...(params?.utility_account_id
            ? { utility_account_id: params.utility_account_id }
            : {}),
        },
      }),
      providesTags: ["UPSAudit"],
    }),

    getUPSAuditById: builder.query<
      GetUPSAuditRecordByIdResponse,
      string
    >({
      query: (id) => ({
        url: `/v1/ups-audits/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "UPSAudit", id }],
    }),

    updateUPSAudit: builder.mutation<
      UpdateUPSAuditResponse,
      UpdateUPSAuditRequest
    >({
      query: ({ id, ...data }) => ({
        url: `/v1/ups-audits/${id}`,
        method: "PUT",
        body: buildUPSAuditFormData(data),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "UPSAudit",
        { type: "UPSAudit", id },
        "UtilityAccount",
        "Facility",
      ],
    }),

    deleteUPSAudit: builder.mutation<
      DeleteUPSAuditResponse,
      string
    >({
      query: (id) => ({
        url: `/v1/ups-audits/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        "UPSAudit",
        { type: "UPSAudit", id },
        "UtilityAccount",
        "Facility",
      ],
    }),

    uploadUPSAuditDocuments: builder.mutation<
      UpdateUPSAuditResponse,
      { id: string; documents: File[]; captions?: string[] }
    >({
      query: ({ id, documents, captions = [] }) => {
        const formData = new FormData();
        documents.forEach((file) => {
          formData.append("documents", file);
        });
        formData.append("captions", JSON.stringify(captions));
        return {
          url: `/v1/ups-audits/${id}/documents`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        "UPSAudit",
        { type: "UPSAudit", id },
      ],
    }),
  }),
});

export const {
  useCreateUPSAuditMutation,
  useGetUPSAuditsQuery,
  useGetUPSAuditByIdQuery,
  useUpdateUPSAuditMutation,
  useDeleteUPSAuditMutation,
  useUploadUPSAuditDocumentsMutation,
} = upsAuditApiSlice;
