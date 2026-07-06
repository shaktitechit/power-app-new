import { apiSlice } from "../apiSlice";

export interface UtilityDocument {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  caption?: string;
  uploadedAt?: string;
}

export interface UtilityAuditStepSubmission {
  submitted_at?: string;
  submitted_by?:
  | string
  | {
    _id?: string;
    name?: string;
    email?: string;
  };
}

export type AccountStatus = "pending" | "completed";
export type DataSheetSectionStatus = "pending" | "completed";

export interface DataSheetConnectedSection {
  connected?: boolean;
  status?: DataSheetSectionStatus;
  completed_at?: string | null;
  completed_by?: string | null;
}

export interface DataSheetAuditSection {
  connected?: boolean;
  status?: DataSheetSectionStatus;
  completed_at?: string | null;
  completed_by?: string | null;
}

export interface UtilityAccountDataSheet {
  solar?: DataSheetConnectedSection;
  dg?: DataSheetConnectedSection;
  transformer?: DataSheetConnectedSection;
  pump?: DataSheetConnectedSection;
  tariff?: DataSheetAuditSection;
  billing?: DataSheetAuditSection;
  hvac?: DataSheetAuditSection;
  ac?: DataSheetAuditSection;
  lighting?: DataSheetAuditSection;
  "street-light"?: DataSheetAuditSection;
  fan?: DataSheetAuditSection;
  lux?: DataSheetAuditSection;
  ups?: DataSheetAuditSection;
  misc?: DataSheetAuditSection;
  transformers?: DataSheetAuditSection;
  "metering-room"?: DataSheetAuditSection;
  "panel-room"?: DataSheetAuditSection;
  "light-db"?: DataSheetAuditSection;
  "dg-set"?: DataSheetAuditSection;
  "earthing-system"?: DataSheetAuditSection;
  "ups-battery"?: DataSheetAuditSection;
  "general-safety"?: DataSheetAuditSection;
  "wiring-inspection"?: DataSheetAuditSection;
  "load-analysis"?: DataSheetAuditSection;
  "leak-inspection"?: DataSheetAuditSection;
  thermography?: DataSheetAuditSection;
  "elevator-safety"?: DataSheetAuditSection;
  "pac-ventilation"?: DataSheetAuditSection;
  "pump-compressor"?: DataSheetAuditSection;
  "additional-items"?: DataSheetAuditSection;
  "documents-review"?: DataSheetAuditSection;
}

export interface UtilityAccount {
  _id: string;
  facility_id: string | { _id?: string; name?: string; city?: string };
  account_number: string;
  connection_type: "LT" | "HT";
  category?: string;
  location?: string;
  sanctioned_demand_kVA?: number;
  sanctioned_demand_value?: number;
  sanctioned_demand_unit?: "kVA" | "kW" | "BHP";

  is_transformer_maintained_by_facility: boolean;

  provider?: string;
  billing_cycle?: string;
  audit_date?: string;
  auditor_id?: string;

  documents: UtilityDocument[];

  /** Overall utility account audit completion */
  accountStatus?: AccountStatus;
  account_completed_at?: string | null;
  account_completed_by?: string | null;

  /** Structured per-section audit progress (energy audit) */
  dataSheet?: UtilityAccountDataSheet;

  completionStats?: {
    percentage: number;
    completed: number;
    total: number;
    breakdown: {
      key: string;
      completed: number;
      total: number;
      isDone: boolean;
    }[];
  };

  /** @deprecated Derived on API responses for backward compatibility */
  audit_step_submissions?: Record<string, UtilityAuditStepSubmission>;

  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateUtilityAccountRequest {
  facility_id: string;
  account_number: string;
  connection_type: "LT" | "HT";
  category?: string;
  location?: string;
  sanctioned_demand_value?: number | string;
  sanctioned_demand_unit?: "kVA" | "kW" | "BHP";

  is_transformer_maintained_by_facility?: boolean;

  data_sheet_inclusions?: Record<string, boolean>;

  provider?: string;
  billing_cycle?: string;
  audit_date?: string;
  auditor_id?: string;

  documents?: File[];
}

export type BulkCreateUtilityAccountItem = Omit<
  CreateUtilityAccountRequest,
  "facility_id" | "documents"
>;

export interface BulkCreateUtilityAccountsRequest {
  facility_id: string;
  accounts: BulkCreateUtilityAccountItem[];
  category?: string;
  location?: string;
  sanctioned_demand_value?: number | string;
  sanctioned_demand_unit?: "kVA" | "kW" | "BHP";
  is_transformer_maintained_by_facility?: boolean;
  data_sheet_inclusions?: Record<string, boolean>;
  provider?: string;
  billing_cycle?: string;
  audit_date?: string;
  auditor_id?: string;
}

export interface BulkCreateUtilityFailedItem {
  index: number;
  account_number: string | null;
  message: string;
}

export interface BulkCreateUtilityAccountsResponse {
  success: boolean;
  message: string;
  data: {
    created: UtilityAccount[];
    failed: BulkCreateUtilityFailedItem[];
    summary: {
      total: number;
      created: number;
      failed: number;
    };
  };
}

export interface UpdateUtilityAccountRequest {
  id: string;
  account_number?: string;
  connection_type?: "LT" | "HT";
  category?: string;
  location?: string;
  sanctioned_demand_value?: number | string;
  sanctioned_demand_unit?: "kVA" | "kW" | "BHP";

  is_transformer_maintained_by_facility?: boolean;

  data_sheet_inclusions?: Record<string, boolean>;

  provider?: string;
  billing_cycle?: string;
  audit_date?: string;
  auditor_id?: string;

  documents?: File[];
  removed_document_ids?: string[];
  existing_documents?: UtilityDocument[];
}

export interface CreateUtilityAccountResponse {
  success: boolean;
  message: string;
  data: UtilityAccount;
}

export interface GetUtilityAccountsResponse {
  success: boolean;
  count: number;
  data: UtilityAccount[];
}

export interface GetUtilityAccountByIdResponse {
  success: boolean;
  data: UtilityAccount;
}

export interface UpdateUtilityAccountResponse {
  success: boolean;
  message: string;
  data: UtilityAccount;
}

export interface DeleteUtilityAccountResponse {
  success: boolean;
  message: string;
}

export interface SubmitUtilityAuditStepResponse {
  success: boolean;
  message: string;
  data: UtilityAccount;
}

// Build FormData
const buildUtilityFormData = (
  data: Partial<CreateUtilityAccountRequest | UpdateUtilityAccountRequest>
) => {
  const formData = new FormData();

  if ("facility_id" in data && data.facility_id !== undefined) {
    formData.append("facility_id", data.facility_id);
  }

  if (data.account_number !== undefined) {
    formData.append("account_number", data.account_number);
  }

  if (data.connection_type !== undefined) {
    formData.append("connection_type", data.connection_type);
  }

  if (data.category !== undefined) {
    formData.append("category", data.category);
  }

  if (data.location !== undefined) {
    formData.append("location", data.location);
  }

  if ("sanctioned_demand_value" in data && data.sanctioned_demand_value !== undefined) {
    formData.append("sanctioned_demand_value", String(data.sanctioned_demand_value));
  }
  if ("sanctioned_demand_unit" in data && data.sanctioned_demand_unit !== undefined) {
    formData.append("sanctioned_demand_unit", data.sanctioned_demand_unit);
  }

  if (data.provider !== undefined) {
    formData.append("provider", data.provider);
  }

  if (data.billing_cycle !== undefined) {
    formData.append("billing_cycle", data.billing_cycle);
  }

  if (data.audit_date !== undefined) {
    formData.append("audit_date", data.audit_date);
  }

  if (data.auditor_id !== undefined) {
    formData.append("auditor_id", data.auditor_id);
  }

  if (data.is_transformer_maintained_by_facility !== undefined) {
    formData.append(
      "is_transformer_maintained_by_facility",
      String(data.is_transformer_maintained_by_facility)
    );
  }

  if (data.data_sheet_inclusions !== undefined) {
    formData.append(
      "data_sheet_inclusions",
      JSON.stringify(data.data_sheet_inclusions),
    );
  }

  if (data.documents?.length) {
    data.documents.forEach((file) => {
      formData.append("documents", file);
    });
  }

  if ("removed_document_ids" in data && Array.isArray(data.removed_document_ids)) {
    formData.append(
      "removed_document_ids",
      JSON.stringify(data.removed_document_ids),
    );
  }

  if ("existing_documents" in data && data.existing_documents !== undefined) {
    formData.append(
      "existing_documents",
      JSON.stringify(data.existing_documents),
    );
  }

  return formData;
};

export const utilityApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createUtilityAccount: builder.mutation<
      CreateUtilityAccountResponse,
      CreateUtilityAccountRequest
    >({
      query: (data) => ({
        url: "/v1/utilities",
        method: "POST",
        body: buildUtilityFormData(data),
      }),
      invalidatesTags: ["UtilityAccount", "Facility", "Dashboard"],
    }),

    bulkCreateUtilityAccounts: builder.mutation<
      BulkCreateUtilityAccountsResponse,
      BulkCreateUtilityAccountsRequest
    >({
      query: (data) => ({
        url: "/v1/utilities/bulk",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["UtilityAccount", "Facility", "Dashboard"],
    }),

    getUtilityAccounts: builder.query<
      GetUtilityAccountsResponse,
      { facility_id?: string } | void
    >({
      query: (params) => ({
        url: "/v1/utilities",
        method: "GET",
        params: params?.facility_id ? { facility_id: params.facility_id } : {},
      }),
      providesTags: ["UtilityAccount"],
    }),

    getUtilityAccountById: builder.query<GetUtilityAccountByIdResponse, string>({
      query: (id) => ({
        url: `/v1/utilities/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [{ type: "UtilityAccount", id }],
    }),

    updateUtilityAccount: builder.mutation<
      UpdateUtilityAccountResponse,
      UpdateUtilityAccountRequest
    >({
      query: ({ id, ...data }) => ({
        url: `/v1/utilities/${id}`,
        method: "PUT",
        body: buildUtilityFormData(data),
      }),
      invalidatesTags: (_result, _error, { id }) => [
        "UtilityAccount",
        { type: "UtilityAccount", id },
        "Facility",
        "Dashboard",
      ],
    }),

    deleteUtilityAccount: builder.mutation<
      DeleteUtilityAccountResponse,
      string
    >({
      query: (id) => ({
        url: `/v1/utilities/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        "UtilityAccount",
        { type: "UtilityAccount", id },
        "Facility",
        "Dashboard",
      ],
    }),

    submitUtilityAuditStep: builder.mutation<
      SubmitUtilityAuditStepResponse,
      { utilityAccountId: string; step: string }
    >({
      query: ({ utilityAccountId, step }) => ({
        url: `/v1/utilities/${utilityAccountId}/audit-step-submit`,
        method: "POST",
        body: { step },
      }),
      async onQueryStarted({ utilityAccountId }, { dispatch, queryFulfilled }) {
        try {
          const { data: response } = await queryFulfilled;
          if (response?.data) {
            dispatch(
              utilityApiSlice.util.updateQueryData(
                "getUtilityAccountById",
                utilityAccountId,
                (draft) => {
                  draft.data = response.data;
                },
              ),
            );
          }
        } catch {
          /* mutation error handled by caller */
        }
      },
      invalidatesTags: (_result, _error, { utilityAccountId }) => [
        "UtilityAccount",
        { type: "UtilityAccount", id: utilityAccountId },
        "Facility",
        "Dashboard",
      ],
    }),

    allowUtilityAuditStep: builder.mutation<
      SubmitUtilityAuditStepResponse,
      { utilityAccountId: string; step: string }
    >({
      query: ({ utilityAccountId, step }) => ({
        url: `/v1/utilities/${utilityAccountId}/audit-step-allow`,
        method: "POST",
        body: { step },
      }),
      async onQueryStarted({ utilityAccountId }, { dispatch, queryFulfilled }) {
        try {
          const { data: response } = await queryFulfilled;
          if (response?.data) {
            dispatch(
              utilityApiSlice.util.updateQueryData(
                "getUtilityAccountById",
                utilityAccountId,
                (draft) => {
                  draft.data = response.data;
                },
              ),
            );
          }
        } catch {
          /* mutation error handled by caller */
        }
      },
      invalidatesTags: (_result, _error, { utilityAccountId }) => [
        "UtilityAccount",
        { type: "UtilityAccount", id: utilityAccountId },
        "Facility",
        "Dashboard",
      ],
    }),

    openUtilityAudit: builder.mutation<
      SubmitUtilityAuditStepResponse,
      { utilityAccountId: string }
    >({
      query: ({ utilityAccountId }) => ({
        url: `/v1/utilities/${utilityAccountId}/open-audit`,
        method: "POST",
      }),
      async onQueryStarted({ utilityAccountId }, { dispatch, queryFulfilled }) {
        try {
          const { data: response } = await queryFulfilled;
          if (response?.data) {
            dispatch(
              utilityApiSlice.util.updateQueryData(
                "getUtilityAccountById",
                utilityAccountId,
                (draft) => {
                  draft.data = response.data;
                },
              ),
            );
          }
        } catch {
          /* mutation error handled by caller */
        }
      },
      invalidatesTags: (_result, _error, { utilityAccountId }) => [
        "UtilityAccount",
        { type: "UtilityAccount", id: utilityAccountId },
        "Facility",
        "UtilityTariff",
        "UtilityBillingRecord",
        "SolarGenerationRecord",
        "SolarPlant",
        "DGAuditRecord",
        "DGSet",
        "TransformerAuditRecord",
        "Transformer",
        "PumpAuditRecord",
        "Pump",
        "HVACAudit",
        "ACAuditRecord",
        "LightingAudit",
        "FanAuditRecord",
        "LuxMeasurement",
        "MiscLoadAudit",
        "SafetyTransformerAudit",
        "SafetyMeteringRoomAudit",
        "SafetyPanelRoomAudit",
        "SafetyLdbAudit",
        "SafetyDgAudit",
        "SafetyEarthingAudit",
        "SafetyUpsAudit",
        "SafetyGeneralAudit",
        "SafetyWiringAudit",
        "SafetyLoadAnalysisAudit",
        "SafetyLeakInspectionAudit",
        "SafetyThermographyAudit",
        "SafetyElevatorAudit",
        "SafetyPacVentilationAudit",
        "SafetyPumpCompressorAudit",
        "SafetyAdditionalItemsAudit",
        "SafetyDocumentsAudit",
        "Dashboard",
      ],
    }),

    uploadUtilityAccountDocuments: builder.mutation<
      UpdateUtilityAccountResponse,
      { id: string; documents: File[]; captions?: string[] }
    >({
      query: ({ id, documents, captions = [] }) => {
        const formData = new FormData();
        documents.forEach((file) => {
          formData.append("documents", file);
        });
        formData.append("captions", JSON.stringify(captions));
        return {
          url: `/v1/utilities/${id}/documents`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { id }) => [
        "UtilityAccount",
        { type: "UtilityAccount", id },
      ],
    }),
  }),
});

export const {
  useCreateUtilityAccountMutation,
  useBulkCreateUtilityAccountsMutation,
  useGetUtilityAccountsQuery,
  useGetUtilityAccountByIdQuery,
  useUpdateUtilityAccountMutation,
  useDeleteUtilityAccountMutation,
  useSubmitUtilityAuditStepMutation,
  useAllowUtilityAuditStepMutation,
  /** Tab-level mark completed → POST /utilities/:id/audit-step-submit */
  useSubmitUtilityAuditStepMutation: useMarkUtilityAuditStepCompletedMutation,
  /** Tab-level mark uncompleted → POST /utilities/:id/audit-step-allow */
  useAllowUtilityAuditStepMutation: useMarkUtilityAuditStepUncompletedMutation,
  useOpenUtilityAuditMutation,
  useUploadUtilityAccountDocumentsMutation,
} = utilityApiSlice;