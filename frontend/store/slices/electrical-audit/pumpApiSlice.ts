import { apiSlice } from "../apiSlice";

export interface PumpDocument {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  uploadedAt?: string;
  caption?: string;
}

export interface Pump {
  _id: string;
  facility_id: string;
  utility_account_id: string;

  pump_tag_number: string;
  make_model?: string;
  rated_power_kW_or_HP?: number;
  rated_efficiency_motor_percent?: number;
  rated_flow_liters_per_hour?: number;
  rated_flow_m3_per_hr?: number;
  rated_head_m?: number;
  rated_speed_RPM?: number;
  number_of_stages?: number;
  year_of_installation?: number;

  audit_date?: string;
  auditor_id?: string;

  documents: PumpDocument[];

  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePumpRequest {
  facility_id: string;
  utility_account_id: string;

  pump_tag_number: string;
  make_model?: string;
  rated_power_kW_or_HP?: number | string;
  rated_efficiency_motor_percent?: number | string;
  rated_flow_liters_per_hour?: number | string;
  rated_flow_m3_per_hr?: number | string;
  rated_head_m?: number | string;
  rated_speed_RPM?: number | string;
  number_of_stages?: number | string;
  year_of_installation?: number | string;

  audit_date?: string;
  auditor_id?: string;

  documents?: File[];
  captions?: string[];
}

export interface UpdatePumpRequest {
  id: string;

  facility_id?: string;
  utility_account_id?: string;

  pump_tag_number?: string;
  make_model?: string;
  rated_power_kW_or_HP?: number | string;
  rated_efficiency_motor_percent?: number | string;
  rated_flow_liters_per_hour?: number | string;
  rated_flow_m3_per_hr?: number | string;
  rated_head_m?: number | string;
  rated_speed_RPM?: number | string;
  number_of_stages?: number | string;
  year_of_installation?: number | string;

  audit_date?: string;
  auditor_id?: string;

  documents?: File[];
  captions?: string[];
  existing_documents?: PumpDocument[];
}

export interface CreatePumpResponse {
  success: boolean;
  message: string;
  data: Pump;
}

export interface GetPumpsResponse {
  success: boolean;
  count: number;
  data: Pump[];
}

export interface GetPumpByIdResponse {
  success: boolean;
  data: Pump;
}

export interface UpdatePumpResponse {
  success: boolean;
  message: string;
  data: Pump;
}

export interface DeletePumpResponse {
  success: boolean;
  message: string;
}

const buildPumpFormData = (
  data: Partial<CreatePumpRequest | UpdatePumpRequest>
) => {
  const formData = new FormData();

  if ("facility_id" in data && data.facility_id !== undefined) {
    formData.append("facility_id", data.facility_id);
  }

  if ("utility_account_id" in data && data.utility_account_id !== undefined) {
    formData.append("utility_account_id", data.utility_account_id);
  }

  if (data.pump_tag_number !== undefined) {
    formData.append("pump_tag_number", data.pump_tag_number);
  }

  if (data.make_model !== undefined) {
    formData.append("make_model", data.make_model);
  }

  if (data.rated_power_kW_or_HP !== undefined) {
    formData.append(
      "rated_power_kW_or_HP",
      String(data.rated_power_kW_or_HP)
    );
  }

  if (data.rated_efficiency_motor_percent !== undefined) {
    formData.append(
      "rated_efficiency_motor_percent",
      String(data.rated_efficiency_motor_percent)
    );
  }

  if (data.rated_flow_liters_per_hour !== undefined) {
    formData.append(
      "rated_flow_liters_per_hour",
      String(data.rated_flow_liters_per_hour)
    );
  }

  if (data.rated_flow_m3_per_hr !== undefined) {
    formData.append(
      "rated_flow_m3_per_hr",
      String(data.rated_flow_m3_per_hr)
    );
  }

  if (data.rated_head_m !== undefined) {
    formData.append("rated_head_m", String(data.rated_head_m));
  }

  if (data.rated_speed_RPM !== undefined) {
    formData.append("rated_speed_RPM", String(data.rated_speed_RPM));
  }

  if (data.number_of_stages !== undefined) {
    formData.append("number_of_stages", String(data.number_of_stages));
  }

  if (data.year_of_installation !== undefined) {
    formData.append(
      "year_of_installation",
      String(data.year_of_installation)
    );
  }

  if (data.audit_date !== undefined) {
    formData.append("audit_date", data.audit_date);
  }

  if (data.auditor_id !== undefined) {
    formData.append("auditor_id", data.auditor_id);
  }

  if (data.documents?.length) {
    data.documents.forEach((file) => {
      formData.append("documents", file);
    });
  }

  if (data.captions?.length) {
    formData.append("captions", JSON.stringify(data.captions));
  }

  if ("existing_documents" in data && data.existing_documents !== undefined) {
    formData.append("existing_documents", JSON.stringify(data.existing_documents));
  }

  return formData;
};

export const pumpApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createPump: builder.mutation<CreatePumpResponse, CreatePumpRequest>({
      query: (data) => ({
        url: "/v1/pumps",
        method: "POST",
        body: buildPumpFormData(data),
      }),
      invalidatesTags: ["Pump", "UtilityAccount", "Facility"],
    }),

    getPumps: builder.query<
      GetPumpsResponse,
      { facility_id?: string; utility_account_id?: string } | void
    >({
      query: (params) => ({
        url: "/v1/pumps",
        method: "GET",
        params: {
          ...(params?.facility_id ? { facility_id: params.facility_id } : {}),
          ...(params?.utility_account_id
            ? { utility_account_id: params.utility_account_id }
            : {}),
        },
      }),
      providesTags: ["Pump"],
    }),

    getPumpById: builder.query<GetPumpByIdResponse, string>({
      query: (id) => ({
        url: `/v1/pumps/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "Pump", id }],
    }),

    updatePump: builder.mutation<UpdatePumpResponse, UpdatePumpRequest>({
      query: ({ id, ...data }) => ({
        url: `/v1/pumps/${id}`,
        method: "PUT",
        body: buildPumpFormData(data),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "Pump",
        { type: "Pump", id },
        "UtilityAccount",
        "Facility",
      ],
    }),

    deletePump: builder.mutation<DeletePumpResponse, string>({
      query: (id) => ({
        url: `/v1/pumps/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        "Pump",
        { type: "Pump", id },
        "UtilityAccount",
        "Facility",
      ],
    }),

    uploadPumpDocuments: builder.mutation<
      UpdatePumpResponse,
      { id: string; documents: File[]; captions?: string[] }
    >({
      query: ({ id, documents, captions }) => {
        const formData = new FormData();
        documents.forEach((file) => formData.append("documents", file));
        if (captions?.length) {
          formData.append("captions", JSON.stringify(captions));
        }
        return {
          url: `/v1/pumps/${id}/documents`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        "Pump",
        { type: "Pump", id },
      ],
    }),
  }),
});

export const {
  useCreatePumpMutation,
  useGetPumpsQuery,
  useGetPumpByIdQuery,
  useUpdatePumpMutation,
  useDeletePumpMutation,
  useUploadPumpDocumentsMutation,
} = pumpApiSlice;