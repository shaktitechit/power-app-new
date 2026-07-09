import { apiSlice } from "./apiSlice";

/** Populated user subset from API */
export interface EnquiryUserRef {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export type EnquiryStatus =
  | "new"
  | "contacted"
  | "in_discussion"
  | "quoted"
  | "negotiation"
  | "won"
  | "lost"
  | "dropped";

export type RequestedAuditType =
  | "Electrical Energy Audit"
  | "Electrical Safety Audit"
  | "Thermal Audit"
  | "Lightning Arrester Audit";

export interface Enquiry {
  _id: string;
  name: string;
  city: string;
  address?: string;
  client_representative?: string;
  client_contact_number?: string;
  client_email?: string;
  client_representatives?: {
    name?: string;
    contact_number?: string;
    email?: string;
  }[];
  assigned_to?: string | EnquiryUserRef | null;
  assigned_admin_to?: string | EnquiryUserRef | null;
  enquiry_status: EnquiryStatus;
  source?: string;
  expected_value?: number;
  requested_audit_types?: RequestedAuditType[];
  notes?: string;
  next_followup_date?: string;
  is_converted_to_facility?: boolean;
  converted_facility_id?: string | { _id?: string; name?: string; city?: string; status?: string };
  created_by: string | EnquiryUserRef;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FollowUp {
  _id: string;
  enquiry_id: string;
  followup_date: string;
  mode?: "call" | "email" | "meeting" | "whatsapp";
  remarks?: string;
  outcome?:
    | "no_response"
    | "interested"
    | "not_interested"
    | "callback_later"
    | "meeting_scheduled";
  next_followup_date?: string;
  created_by: string | EnquiryUserRef;
  deleted_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
}


export interface EnquiryDocumentDetails {
  fileUrl: string;
  fileType: "image" | "pdf";
  fileName?: string;
  caption?: string;
  uploadedAt?: string;
}

export interface EnquiryDocument {
  _id: string;
  enquiry_id:
    | string
    | {
        _id: string;
        name?: string;
        city?: string;
        enquiry_status?: EnquiryStatus;
      };
  document_number?: string;
  document: EnquiryDocumentDetails;
  created_by: string | EnquiryUserRef;
  deleted_at?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetEnquiriesQueryArgs {
  enquiry_status?: EnquiryStatus;
  city?: string;
  assigned_to?: string;
}

export interface CreateEnquiryRequest {
  name: string;
  city: string;
  address?: string;
  client_representative?: string;
  client_contact_number?: string;
  client_email?: string;
  client_representatives?: Enquiry["client_representatives"];
  assigned_to?: string | null;
  enquiry_status?: EnquiryStatus;
  source?: string;
  expected_value?: number;
  requested_audit_types?: RequestedAuditType[];
  notes?: string;
  next_followup_date?: string | null;
}

export interface UpdateEnquiryRequest {
  id: string;
  name?: string;
  city?: string;
  address?: string;
  client_representative?: string;
  client_contact_number?: string;
  client_email?: string;
  client_representatives?: Enquiry["client_representatives"];
  assigned_to?: string | null;
  enquiry_status?: EnquiryStatus;
  source?: string;
  expected_value?: number | null;
  requested_audit_types?: RequestedAuditType[];
  notes?: string;
  next_followup_date?: string | null;
  is_converted_to_facility?: boolean;
  converted_facility_id?: string | null;
}

export interface CreateFollowUpRequest {
  enquiryId: string;
  followup_date: string;
  mode?: FollowUp["mode"];
  remarks?: string;
  outcome?: FollowUp["outcome"];
  next_followup_date?: string | null;
}

export interface UpdateFollowUpRequest {
  enquiryId: string;
  followUpId: string;
  followup_date?: string;
  mode?: FollowUp["mode"];
  remarks?: string;
  outcome?: FollowUp["outcome"];
  next_followup_date?: string | null;
}

export interface CreateEnquiryDocumentRequest {
  enquiryId: string;
  document_number?: string;
  document?: EnquiryDocumentDetails;
  document_url?: string;
  file?: File;
  caption?: string;
}

export interface UpdateEnquiryDocumentRequest {
  enquiryId: string;
  enquiryDocumentId: string;
  document_number?: string | null;
  document?: EnquiryDocumentDetails | null;
  document_url?: string | null;
  file?: File;
  caption?: string;
}

export interface DeleteEnquiryDocumentRequest {
  enquiryId: string;
  enquiryDocumentId: string;
  workflow_remark?: string | null;
}

export interface EnquiryMutationResponse<T = Enquiry> {
  success: boolean;
  message: string;
  data: T;
}

export interface EnquiryListResponse {
  success: boolean;
  count: number;
  data: Enquiry[];
}

export interface EnquiryDetailResponse {
  success: boolean;
  data: Enquiry;
}

export interface FollowUpListResponse {
  success: boolean;
  count: number;
  data: FollowUp[];
}

export interface FollowUpDetailResponse {
  success: boolean;
  data: FollowUp;
}

export interface EnquiryDocumentListResponse {
  success: boolean;
  count: number;
  data: EnquiryDocument[];
}

export interface EnquiryDocumentDetailResponse {
  success: boolean;
  data: EnquiryDocument;
}

export interface DeleteMutationResponse {
  success: boolean;
  message: string;
}

function enquiryListTags() {
  return [{ type: "Enquiry" as const, id: "LIST" }];
}

function followUpListTag(enquiryId: string) {
  return { type: "FollowUp" as const, id: `ENQUIRY-${enquiryId}` };
}

function enquiryDocumentListTag(enquiryId: string) {
  return { type: "EnquiryDocument" as const, id: `ENQUIRY-${enquiryId}` };
}

function enquiryDocumentPendingApprovalListTag() {
  return { type: "EnquiryDocument" as const, id: "PENDING_APPROVAL_LIST" };
}

const buildEnquiryDocumentFormData = (data: Partial<CreateEnquiryDocumentRequest | UpdateEnquiryDocumentRequest>) => {
  const formData = new FormData();
  if (data.document_number !== undefined && data.document_number !== null) {
    formData.append("quotation_number", data.document_number); // matching backend body expects quotation_number
  }
  if (data.document_url !== undefined && data.document_url !== null) {
    formData.append("document_url", data.document_url);
  }
  if (data.caption !== undefined && data.caption !== null) {
    formData.append("caption", data.caption);
  }
  if (data.file) {
    formData.append("documents", data.file);
  }
  if (data.document) {
    formData.append("document", JSON.stringify(data.document));
  }
  return formData;
};

export const enquiryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createEnquiry: builder.mutation<
      EnquiryMutationResponse,
      CreateEnquiryRequest
    >({
      query: (body) => ({
        url: "/v1/enquiries",
        method: "POST",
        body,
      }),
      invalidatesTags: enquiryListTags,
    }),

    getEnquiries: builder.query<
      EnquiryListResponse,
      GetEnquiriesQueryArgs | void
    >({
      query: (params) => ({
        url: "/v1/enquiries",
        method: "GET",
        params: params ?? {},
      }),
      providesTags: enquiryListTags,
    }),

    getEnquiryById: builder.query<EnquiryDetailResponse, string>({
      query: (id) => ({
        url: `/v1/enquiries/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [
        ...enquiryListTags(),
        { type: "Enquiry", id },
      ],
    }),

    updateEnquiry: builder.mutation<
      EnquiryMutationResponse,
      UpdateEnquiryRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/enquiries/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        ...enquiryListTags(),
        { type: "Enquiry", id },
        followUpListTag(id),
        enquiryDocumentListTag(id),
      ],
    }),

    deleteEnquiry: builder.mutation<DeleteMutationResponse, string>({
      query: (id) => ({
        url: `/v1/enquiries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        ...enquiryListTags(),
        { type: "Enquiry", id },
        followUpListTag(id),
        enquiryDocumentListTag(id),
      ],
    }),

    getFollowUps: builder.query<FollowUpListResponse, string>({
      query: (enquiryId) => ({
        url: `/v1/enquiries/${enquiryId}/follow-ups`,
        method: "GET",
      }),
      providesTags: (_result, _error, enquiryId) => [
        followUpListTag(enquiryId),
      ],
    }),

    getFollowUpById: builder.query<
      FollowUpDetailResponse,
      { enquiryId: string; followUpId: string }
    >({
      query: ({ enquiryId, followUpId }) => ({
        url: `/v1/enquiries/${enquiryId}/follow-ups/${followUpId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { enquiryId, followUpId }) => [
        followUpListTag(enquiryId),
        { type: "FollowUp", id: followUpId },
      ],
    }),

    createFollowUp: builder.mutation<
      EnquiryMutationResponse<FollowUp>,
      CreateFollowUpRequest
    >({
      query: ({ enquiryId, ...body }) => ({
        url: `/v1/enquiries/${enquiryId}/follow-ups`,
        method: "POST",
        body,
      }),
      invalidatesTags: (_result, _error, { enquiryId }) => [
        followUpListTag(enquiryId),
        { type: "Enquiry", id: enquiryId },
      ],
    }),

    updateFollowUp: builder.mutation<
      EnquiryMutationResponse<FollowUp>,
      UpdateFollowUpRequest
    >({
      query: ({ enquiryId, followUpId, ...body }) => ({
        url: `/v1/enquiries/${enquiryId}/follow-ups/${followUpId}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { enquiryId, followUpId }) => [
        followUpListTag(enquiryId),
        { type: "FollowUp", id: followUpId },
        { type: "Enquiry", id: enquiryId },
      ],
    }),

    deleteFollowUp: builder.mutation<
      DeleteMutationResponse,
      { enquiryId: string; followUpId: string }
    >({
      query: ({ enquiryId, followUpId }) => ({
        url: `/v1/enquiries/${enquiryId}/follow-ups/${followUpId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { enquiryId, followUpId }) => [
        followUpListTag(enquiryId),
        { type: "FollowUp", id: followUpId },
        { type: "Enquiry", id: enquiryId },
      ],
    }),

    getEnquiryDocuments: builder.query<EnquiryDocumentListResponse, string>({
      query: (enquiryId) => ({
        url: `/v1/enquiries/${enquiryId}/enquiry-documents`,
        method: "GET",
      }),
      providesTags: (_result, _error, enquiryId) => [
        enquiryDocumentListTag(enquiryId),
      ],
    }),


    getEnquiryDocumentById: builder.query<
      EnquiryDocumentDetailResponse,
      { enquiryId: string; enquiryDocumentId: string }
    >({
      query: ({ enquiryId, enquiryDocumentId }) => ({
        url: `/v1/enquiries/${enquiryId}/enquiry-documents/${enquiryDocumentId}`,
        method: "GET",
      }),
      providesTags: (_result, _error, { enquiryId, enquiryDocumentId }) => [
        enquiryDocumentListTag(enquiryId),
        { type: "EnquiryDocument", id: enquiryDocumentId },
      ],
    }),

    createEnquiryDocument: builder.mutation<
      EnquiryMutationResponse<EnquiryDocument>,
      CreateEnquiryDocumentRequest
    >({
      query: ({ enquiryId, ...body }) => ({
        url: `/v1/enquiries/${enquiryId}/enquiry-documents`,
        method: "POST",
        body: buildEnquiryDocumentFormData(body),
      }),
      invalidatesTags: (_result, _error, { enquiryId }) => [
        enquiryDocumentListTag(enquiryId),
        enquiryDocumentPendingApprovalListTag(),
        { type: "Enquiry", id: enquiryId },
      ],
    }),

    updateEnquiryDocument: builder.mutation<
      EnquiryMutationResponse<EnquiryDocument>,
      UpdateEnquiryDocumentRequest
    >({
      query: ({ enquiryId, enquiryDocumentId, ...body }) => ({
        url: `/v1/enquiries/${enquiryId}/enquiry-documents/${enquiryDocumentId}`,
        method: "PUT",
        body: buildEnquiryDocumentFormData(body),
      }),
      invalidatesTags: (_result, _error, { enquiryId, enquiryDocumentId }) => [
        enquiryDocumentListTag(enquiryId),
        enquiryDocumentPendingApprovalListTag(),
        { type: "EnquiryDocument", id: enquiryDocumentId },
        { type: "Enquiry", id: enquiryId },
      ],
    }),

    deleteEnquiryDocument: builder.mutation<
      DeleteMutationResponse,
      DeleteEnquiryDocumentRequest
    >({
      query: ({ enquiryId, enquiryDocumentId, workflow_remark }) => {
        const trimmed =
          workflow_remark != null ? String(workflow_remark).trim() : "";
        return {
          url: `/v1/enquiries/${enquiryId}/enquiry-documents/${enquiryDocumentId}`,
          method: "DELETE",
          body: trimmed ? { workflow_remark: trimmed } : undefined,
        };
      },
      invalidatesTags: (_result, _error, { enquiryId, enquiryDocumentId }) => [
        enquiryDocumentListTag(enquiryId),
        enquiryDocumentPendingApprovalListTag(),
        { type: "EnquiryDocument", id: enquiryDocumentId },
        { type: "Enquiry", id: enquiryId },
      ],
    }),
  }),
});

export const {
  useCreateEnquiryMutation,
  useGetEnquiriesQuery,
  useGetEnquiryByIdQuery,
  useUpdateEnquiryMutation,
  useDeleteEnquiryMutation,
  useGetFollowUpsQuery,
  useGetFollowUpByIdQuery,
  useCreateFollowUpMutation,
  useUpdateFollowUpMutation,
  useDeleteFollowUpMutation,
  useGetEnquiryDocumentsQuery,
  useGetEnquiryDocumentByIdQuery,
  useCreateEnquiryDocumentMutation,
  useUpdateEnquiryDocumentMutation,
  useDeleteEnquiryDocumentMutation,
} = enquiryApiSlice;
