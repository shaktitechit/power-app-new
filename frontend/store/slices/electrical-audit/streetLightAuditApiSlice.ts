import { apiSlice } from "../apiSlice";

export interface StreetLightAuditDocument {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  caption?: string;
  uploadedAt?: string;
}

export interface StreetLightAuditRecord {
  _id: string;
  facility_id: string;
  utility_account_id: string;

  area_location?: string;
  fixture_type?: string;
  lamp_type?: string;
  wattage_W?: number | string;
  quantity_nos?: number | string;
  control_type?: "manual" | "timer" | "sensor" | "other";
  working_hours_per_day?: number | string;
  working_days_per_year?: number | string;
  connected_load_kW?: number | string;
  annual_energy_kWh?: number | string;
  remarks?: string;

  audit_date?: string;
  auditor_id?: string;

  documents: StreetLightAuditDocument[];

  is_completed?: boolean;

  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateStreetLightAuditRequest {
  facility_id: string;
  utility_account_id: string;

  area_location?: string;
  fixture_type?: string;
  lamp_type?: string;
  wattage_W?: number | string;
  quantity_nos?: number | string;
  control_type?: "manual" | "timer" | "sensor" | "other";
  working_hours_per_day?: number | string;
  working_days_per_year?: number | string;
  connected_load_kW?: number | string;
  annual_energy_kWh?: number | string;
  remarks?: string;

  audit_date?: string;
  auditor_id?: string;

  documents?: File[];
  is_completed?: boolean;
  existing_documents?: StreetLightAuditDocument[];
}

export interface UpdateStreetLightAuditRequest {
  id: string;

  facility_id?: string;
  utility_account_id?: string;

  area_location?: string;
  fixture_type?: string;
  lamp_type?: string;
  wattage_W?: number | string;
  quantity_nos?: number | string;
  control_type?: "manual" | "timer" | "sensor" | "other";
  working_hours_per_day?: number | string;
  working_days_per_year?: number | string;
  connected_load_kW?: number | string;
  annual_energy_kWh?: number | string;
  remarks?: string;

  audit_date?: string;
  auditor_id?: string;

  documents?: File[];
  is_completed?: boolean;

  existing_documents?: StreetLightAuditDocument[];
}

export interface CreateStreetLightAuditResponse {
  success: boolean;
  message?: string;
  data: StreetLightAuditRecord;
}

export interface GetStreetLightAuditRecordsResponse {
  success: boolean;
  count: number;
  data: StreetLightAuditRecord[];
}

export interface GetStreetLightAuditRecordByIdResponse {
  success: boolean;
  data: StreetLightAuditRecord;
}

export interface UpdateStreetLightAuditResponse {
  success: boolean;
  message?: string;
  data: StreetLightAuditRecord;
}

export interface DeleteStreetLightAuditResponse {
  success: boolean;
  message: string;
}

const buildStreetLightAuditFormData = (
  data: Partial<CreateStreetLightAuditRequest | UpdateStreetLightAuditRequest>
) => {
  const formData = new FormData();

  if ("facility_id" in data && data.facility_id !== undefined) {
    formData.append("facility_id", data.facility_id);
  }

  if ("utility_account_id" in data && data.utility_account_id !== undefined) {
    formData.append("utility_account_id", data.utility_account_id);
  }

  if (data.area_location !== undefined && data.area_location !== null) {
    formData.append("area_location", data.area_location);
  }

  if (data.fixture_type !== undefined && data.fixture_type !== null) {
    formData.append("fixture_type", data.fixture_type);
  }

  if (data.lamp_type !== undefined && data.lamp_type !== null) {
    formData.append("lamp_type", data.lamp_type);
  }

  if (data.wattage_W !== undefined && data.wattage_W !== null) {
    formData.append("wattage_W", String(data.wattage_W));
  }

  if (data.quantity_nos !== undefined && data.quantity_nos !== null) {
    formData.append("quantity_nos", String(data.quantity_nos));
  }

  if (data.control_type !== undefined && data.control_type !== null) {
    formData.append("control_type", data.control_type);
  }

  if (
    data.working_hours_per_day !== undefined &&
    data.working_hours_per_day !== null
  ) {
    formData.append(
      "working_hours_per_day",
      String(data.working_hours_per_day)
    );
  }

  if (
    data.working_days_per_year !== undefined &&
    data.working_days_per_year !== null
  ) {
    formData.append(
      "working_days_per_year",
      String(data.working_days_per_year)
    );
  }

  if (data.connected_load_kW !== undefined && data.connected_load_kW !== null) {
    formData.append("connected_load_kW", String(data.connected_load_kW));
  }

  if (
    data.annual_energy_kWh !== undefined &&
    data.annual_energy_kWh !== null
  ) {
    formData.append("annual_energy_kWh", String(data.annual_energy_kWh));
  }

  if (data.remarks !== undefined && data.remarks !== null) {
    formData.append("remarks", data.remarks);
  }

  if (data.audit_date !== undefined && data.audit_date !== null) {
    formData.append("audit_date", data.audit_date);
  }

  if (data.auditor_id !== undefined && data.auditor_id !== null) {
    formData.append("auditor_id", data.auditor_id);
  }

  if (data.documents?.length) {
    data.documents.forEach((file) => {
      formData.append("documents", file);
    });
  }

  if ("existing_documents" in data && data.existing_documents !== undefined) {
    formData.append(
      "existing_documents",
      JSON.stringify(data.existing_documents),
    );
  }

  if (data.is_completed !== undefined) {
    formData.append("is_completed", String(data.is_completed));
  }

  return formData;
};

export const streetLightAuditApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createStreetLightAudit: builder.mutation<
      CreateStreetLightAuditResponse,
      CreateStreetLightAuditRequest
    >({
      query: (data) => ({
        url: "/v1/street-light-audits",
        method: "POST",
        body: buildStreetLightAuditFormData(data),
      }),
      invalidatesTags: ["StreetLightAudit", "UtilityAccount", "Facility"],
    }),

    getStreetLightAudits: builder.query<
      GetStreetLightAuditRecordsResponse,
      { facility_id?: string; utility_account_id?: string } | void
    >({
      query: (params) => ({
        url: "/v1/street-light-audits",
        method: "GET",
        params: {
          ...(params?.facility_id ? { facility_id: params.facility_id } : {}),
          ...(params?.utility_account_id
            ? { utility_account_id: params.utility_account_id }
            : {}),
        },
      }),
      providesTags: ["StreetLightAudit"],
    }),

    getStreetLightAuditById: builder.query<
      GetStreetLightAuditRecordByIdResponse,
      string
    >({
      query: (id) => ({
        url: `/v1/street-light-audits/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "StreetLightAudit", id }],
    }),

    updateStreetLightAudit: builder.mutation<
      UpdateStreetLightAuditResponse,
      UpdateStreetLightAuditRequest
    >({
      query: ({ id, ...data }) => ({
        url: `/v1/street-light-audits/${id}`,
        method: "PUT",
        body: buildStreetLightAuditFormData(data),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "StreetLightAudit",
        { type: "StreetLightAudit", id },
        "UtilityAccount",
        "Facility",
      ],
    }),

    deleteStreetLightAudit: builder.mutation<
      DeleteStreetLightAuditResponse,
      string
    >({
      query: (id) => ({
        url: `/v1/street-light-audits/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        "StreetLightAudit",
        { type: "StreetLightAudit", id },
        "UtilityAccount",
        "Facility",
      ],
    }),

    uploadStreetLightAuditDocuments: builder.mutation<
      UpdateStreetLightAuditResponse,
      { id: string; documents: File[]; captions?: string[] }
    >({
      query: ({ id, documents, captions = [] }) => {
        const formData = new FormData();
        documents.forEach((file) => {
          formData.append("documents", file);
        });
        formData.append("captions", JSON.stringify(captions));
        return {
          url: `/v1/street-light-audits/${id}/documents`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        "StreetLightAudit",
        { type: "StreetLightAudit", id },
      ],
    }),
  }),
});

export const {
  useCreateStreetLightAuditMutation,
  useGetStreetLightAuditsQuery,
  useGetStreetLightAuditByIdQuery,
  useUpdateStreetLightAuditMutation,
  useDeleteStreetLightAuditMutation,
  useUploadStreetLightAuditDocumentsMutation,
} = streetLightAuditApiSlice;
