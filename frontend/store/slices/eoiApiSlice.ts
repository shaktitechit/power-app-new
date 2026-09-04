import { apiSlice } from "./apiSlice";

export interface EoiUserRef {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
}

export type EoiStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export interface EoiCompany {
  name: string;
  address?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
}

export interface EoiRecipient {
  designation: string;
  organization: string;
  address?: string;
  email?: string;
  phone?: string;
}

export interface EoiSignatory {
  userId?: string | EoiUserRef | null;
  label?: string;
  name: string;
  designation?: string;
  companyName?: string;
  phone?: string;
  signature?: string;
}

export interface EoiEnquiryRef {
  _id: string;
  name?: string;
  city?: string;
  enquiry_number?: string;
  enquiry_status?: string;
  requested_audit_types?: string[];
  client_representative?: string;
}

export interface ExpressionOfInterest {
  _id: string;
  eoiRef: string;
  eoiDate: string;
  subject: string;
  salutation?: string;
  body: string;
  complimentaryClose?: string;
  company: EoiCompany;
  recipient: EoiRecipient;
  enquiryId?: string | EoiEnquiryRef | null;
  signatory: EoiSignatory;
  status: EoiStatus;
  quotationId?: string | null;
  pdfUrl?: string;
  internalNotes?: string;
  createdBy?: string | EoiUserRef | null;
  updatedBy?: string | EoiUserRef | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type Eoi = ExpressionOfInterest;

export interface CreateEoiRequest {
  enquiryId?: string;
  leadId?: string;
  eoiRef?: string;
  eoiDate?: string;
  subject?: string;
  salutation?: string;
  body?: string;
  complimentaryClose?: string;
  company?: Partial<EoiCompany>;
  recipient?: Partial<EoiRecipient>;
  signatory?: Partial<EoiSignatory>;
  status?: EoiStatus;
  quotationId?: string;
  pdfUrl?: string;
  internalNotes?: string;
}

export type UpdateEoiRequest = { id: string } & Partial<CreateEoiRequest>;

export interface GetEoisQueryArgs {
  enquiryId?: string;
  leadId?: string;
  status?: EoiStatus;
  search?: string;
}

export interface UpdateEoiStatusRequest {
  id: string;
  status: EoiStatus;
}

export interface AcceptEoiRequest {
  id: string;
}

export interface SendEoiEmailRequest {
  id: string;
  from?: string;
  to: string;
  cc?: string;
  subject?: string;
  body?: string;
  attachment?: File;
}

export interface EoiSignatoryUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "super_admin" | "admin" | "manager";
}

export interface EoiSignatoryListResponse {
  success: boolean;
  count: number;
  data: EoiSignatoryUser[];
}

export interface EoiListResponse {
  success: boolean;
  count: number;
  data: ExpressionOfInterest[];
}

export interface EoiDetailResponse {
  success: boolean;
  data: ExpressionOfInterest;
}

export interface EoiMutationResponse {
  success: boolean;
  message: string;
  data: ExpressionOfInterest;
}

export interface EoiDeleteResponse {
  success: boolean;
  message: string;
}

function eoiEnquiryId(value?: string | EoiEnquiryRef | null) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value._id;
}

function eoiListTags() {
  return [{ type: "ExpressionOfInterest" as const, id: "LIST" }];
}

function eoiEnquiryListTag(enquiryId: string) {
  return { type: "ExpressionOfInterest" as const, id: `ENQUIRY-${enquiryId}` };
}

function eoiMutationTags(enquiryId?: string | null, eoiIdValue?: string) {
  return [
    ...eoiListTags(),
    ...(enquiryId
      ? [
          eoiEnquiryListTag(enquiryId),
          { type: "Enquiry" as const, id: enquiryId },
          { type: "Enquiry" as const, id: "LIST" },
        ]
      : []),
    ...(eoiIdValue
      ? [{ type: "ExpressionOfInterest" as const, id: eoiIdValue }]
      : []),
  ];
}

export const eoiApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getEois: builder.query<EoiListResponse, GetEoisQueryArgs | void>({
      query: (params) => ({
        url: "/v1/expression-of-interest",
        method: "GET",
        params: params ?? {},
      }),
      providesTags: (result, _error, params) => [
        ...eoiListTags(),
        ...(params?.enquiryId ? [eoiEnquiryListTag(params.enquiryId)] : []),
        ...(result?.data ?? []).map((eoi) => ({
          type: "ExpressionOfInterest" as const,
          id: eoi._id,
        })),
      ],
    }),

    getEoiSignatories: builder.query<EoiSignatoryListResponse, void>({
      query: () => ({
        url: "/v1/expression-of-interest/signatories",
        method: "GET",
      }),
      providesTags: [{ type: "User", id: "EOI_SIGNATORIES" }],
    }),

    getEoiById: builder.query<EoiDetailResponse, string>({
      query: (id) => ({
        url: `/v1/expression-of-interest/${id}`,
        method: "GET",
      }),
      providesTags: (result, _error, id) => {
        const enquiryId = eoiEnquiryId(result?.data?.enquiryId);
        return [
          { type: "ExpressionOfInterest", id },
          ...eoiListTags(),
          ...(enquiryId ? [eoiEnquiryListTag(enquiryId)] : []),
        ];
      },
    }),

    createEoi: builder.mutation<EoiMutationResponse, CreateEoiRequest>({
      query: (body) => ({
        url: "/v1/expression-of-interest",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, body) =>
        eoiMutationTags(
          body.enquiryId || eoiEnquiryId(result?.data?.enquiryId),
          result?.data?._id,
        ),
    }),

    updateEoi: builder.mutation<EoiMutationResponse, UpdateEoiRequest>({
      query: ({ id, ...body }) => ({
        url: `/v1/expression-of-interest/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, _error, { id }) =>
        eoiMutationTags(eoiEnquiryId(result?.data?.enquiryId), id),
    }),

    updateEoiStatus: builder.mutation<
      EoiMutationResponse,
      UpdateEoiStatusRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/expression-of-interest/${id}/status`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, _error, { id }) =>
        eoiMutationTags(eoiEnquiryId(result?.data?.enquiryId), id),
    }),

    acceptEoi: builder.mutation<EoiMutationResponse, AcceptEoiRequest>({
      query: ({ id }) => ({
        url: `/v1/expression-of-interest/${id}/accept`,
        method: "PUT",
      }),
      invalidatesTags: (result, _error, { id }) =>
        eoiMutationTags(eoiEnquiryId(result?.data?.enquiryId), id),
    }),

    sendEoiEmail: builder.mutation<EoiMutationResponse, SendEoiEmailRequest>({
      query: ({ id, from, to, cc, subject, body, attachment }) => {
        const formData = new FormData();
        if (from) formData.append("from", from);
        formData.append("to", to);
        if (cc) formData.append("cc", cc);
        if (subject) formData.append("subject", subject);
        if (body) formData.append("body", body);
        if (attachment) formData.append("attachment", attachment);
        return {
          url: `/v1/expression-of-interest/${id}/send-email`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (result, _error, { id }) =>
        eoiMutationTags(eoiEnquiryId(result?.data?.enquiryId), id),
    }),

    deleteEoi: builder.mutation<EoiDeleteResponse, string>({
      query: (id) => ({
        url: `/v1/expression-of-interest/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => eoiMutationTags(undefined, id),
    }),
  }),
});

export const {
  useGetEoisQuery,
  useGetEoiByIdQuery,
  useGetEoiSignatoriesQuery,
  useCreateEoiMutation,
  useUpdateEoiMutation,
  useUpdateEoiStatusMutation,
  useAcceptEoiMutation,
  useSendEoiEmailMutation,
  useDeleteEoiMutation,
} = eoiApiSlice;
