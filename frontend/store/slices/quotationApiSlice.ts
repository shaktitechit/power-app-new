import { apiSlice } from "./apiSlice";

export interface QuotationUserRef {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  phone?: string;
}

export type QuotationStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED"
  | "CANCELLED";

export type QuotationTaxType = "intra" | "inter" | "igst";

export interface QuotationItem {
  srNo: number;
  description: string;
  hsnSac?: string;
  quantity: number;
  unit?: string;
  rate: number;
  amount: number;
}

export interface QuotationTerm {
  termNo: number;
  title: string;
  content: string;
}

export interface QuotationCompany {
  name: string;
  address: string;
  phone?: string;
  mobile?: string;
  email?: string;
  website?: string;
  gstin?: string;
}

export interface QuotationCustomer {
  customerId?: string | null;
  name: string;
  address: string;
  gstin?: string;
  phone?: string;
  mobile?: string;
  email?: string;
  kindAttn?: string;
}

export interface QuotationFinancials {
  subtotal: number;
  gstRate?: number;
  taxType?: QuotationTaxType;
  cgst?: number;
  sgst?: number;
  igst?: number;
  totalGst: number;
  grandTotal: number;
  roundedGrandTotal: number;
  amountInWords: string;
}

export interface QuotationBankDetails {
  beneficiaryName: string;
  accountNo: string;
  bankName: string;
  branch?: string;
  ifscCode: string;
  swiftCode?: string;
  micrCode?: string;
}

export interface QuotationSignatory {
  electronic?: boolean;
  userId?: string | QuotationUserRef | null;
  name: string;
  designation?: string;
  companyName?: string;
  phone?: string;
  signature?: string;
  signatureDate?: string;
  seal?: string;
}

export interface QuotationOrderAcceptance {
  enabled?: boolean;
  customerName?: string;
  companyName?: string;
  designation?: string;
  acceptedDate?: string;
  remarks?: string;
  signature?: string;
  companySeal?: string;
}

export interface QuotationEnquiryRef {
  _id: string;
  name?: string;
  city?: string;
  enquiry_number?: string;
  enquiry_status?: string;
  client_representative?: string;
}

export interface Quotation {
  _id: string;
  quotationRef: string;
  quotationDate: string;
  validUntil?: string;
  reference?: string;
  subject: string;
  company: QuotationCompany;
  customer: QuotationCustomer;
  enquiryId?: string | QuotationEnquiryRef | null;
  leadId?: string | null;
  opportunityId?: string | null;
  items: QuotationItem[];
  financials: QuotationFinancials;
  termsAndConditions?: QuotationTerm[];
  bankDetails: QuotationBankDetails;
  signatory: QuotationSignatory;
  orderAcceptance?: QuotationOrderAcceptance;
  status: QuotationStatus;
  salesOrderId?: string | null;
  invoiceId?: string | null;
  pdfUrl?: string;
  internalNotes?: string;
  createdBy?: string | QuotationUserRef | null;
  updatedBy?: string | QuotationUserRef | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type QuotationItemInput = Partial<QuotationItem> & {
  description: string;
  quantity: number;
  rate: number;
};

export type QuotationTermInput = QuotationTerm | string;

export interface CreateQuotationRequest {
  enquiryId?: string;
  leadId?: string;
  opportunityId?: string;
  quotationRef?: string;
  quotationDate?: string;
  validUntil?: string;
  reference?: string;
  subject?: string;
  company?: Partial<QuotationCompany>;
  customer?: Partial<QuotationCustomer>;
  items: QuotationItemInput[];
  financials?: Partial<Pick<QuotationFinancials, "gstRate" | "taxType" | "igst">>;
  termsAndConditions?: QuotationTermInput[];
  termsConditionsIds?: string[];
  bankDetails?: Partial<QuotationBankDetails>;
  signatory?: Partial<QuotationSignatory>;
  orderAcceptance?: Partial<QuotationOrderAcceptance>;
  status?: QuotationStatus;
  pdfUrl?: string;
  internalNotes?: string;
}

export type UpdateQuotationRequest = { id: string } & Partial<
  Omit<CreateQuotationRequest, "items">
> & {
  items?: QuotationItemInput[];
};

export interface GetQuotationsQueryArgs {
  enquiryId?: string;
  leadId?: string;
  status?: QuotationStatus;
  search?: string;
}

export interface UpdateQuotationStatusRequest {
  id: string;
  status: QuotationStatus;
  orderAcceptance?: Partial<QuotationOrderAcceptance>;
}

export interface AcceptQuotationRequest {
  id: string;
  customerName?: string;
  companyName?: string;
  designation?: string;
  acceptedDate?: string;
  remarks?: string;
  signature?: string;
  companySeal?: string;
}

export interface SendQuotationEmailRequest {
  id: string;
  from?: string;
  to: string;
  cc?: string;
  subject?: string;
  body?: string;
  attachment?: File;
}

export interface QuotationSignatoryUser {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role: "super_admin" | "admin" | "manager";
}

export interface QuotationSignatoryListResponse {
  success: boolean;
  count: number;
  data: QuotationSignatoryUser[];
}

export interface QuotationListResponse {
  success: boolean;
  count: number;
  data: Quotation[];
}

export interface QuotationDetailResponse {
  success: boolean;
  data: Quotation;
}

export interface QuotationMutationResponse {
  success: boolean;
  message: string;
  data: Quotation;
}

export interface QuotationDeleteResponse {
  success: boolean;
  message: string;
}

function quotationId(value?: string | QuotationEnquiryRef | null) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value._id;
}

function quotationListTags() {
  return [{ type: "Quotation" as const, id: "LIST" }];
}

function quotationEnquiryListTag(enquiryId: string) {
  return { type: "Quotation" as const, id: `ENQUIRY-${enquiryId}` };
}

function quotationMutationTags(enquiryId?: string | null, quotationIdValue?: string) {
  return [
    ...quotationListTags(),
    ...(enquiryId
      ? [
          quotationEnquiryListTag(enquiryId),
          { type: "Enquiry" as const, id: enquiryId },
          { type: "Enquiry" as const, id: "LIST" },
        ]
      : []),
    ...(quotationIdValue ? [{ type: "Quotation" as const, id: quotationIdValue }] : []),
  ];
}

export const quotationApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getQuotations: builder.query<
      QuotationListResponse,
      GetQuotationsQueryArgs | void
    >({
      query: (params) => ({
        url: "/v1/quotations",
        method: "GET",
        params: params ?? {},
      }),
      providesTags: (result, _error, params) => [
        ...quotationListTags(),
        ...(params?.enquiryId ? [quotationEnquiryListTag(params.enquiryId)] : []),
        ...(result?.data ?? []).map((quotation) => ({
          type: "Quotation" as const,
          id: quotation._id,
        })),
      ],
    }),

    getQuotationSignatories: builder.query<QuotationSignatoryListResponse, void>({
      query: () => ({
        url: "/v1/quotations/signatories",
        method: "GET",
      }),
      providesTags: [{ type: "User", id: "QUOTATION_SIGNATORIES" }],
    }),

    getQuotationById: builder.query<QuotationDetailResponse, string>({
      query: (id) => ({
        url: `/v1/quotations/${id}`,
        method: "GET",
      }),
      providesTags: (result, _error, id) => {
        const enquiryId = quotationId(result?.data?.enquiryId);
        return [
          { type: "Quotation", id },
          ...quotationListTags(),
          ...(enquiryId ? [quotationEnquiryListTag(enquiryId)] : []),
        ];
      },
    }),

    createQuotation: builder.mutation<
      QuotationMutationResponse,
      CreateQuotationRequest
    >({
      query: (body) => ({
        url: "/v1/quotations",
        method: "POST",
        body,
      }),
      invalidatesTags: (result, _error, body) =>
        quotationMutationTags(
          body.enquiryId || quotationId(result?.data?.enquiryId),
          result?.data?._id,
        ),
    }),

    updateQuotation: builder.mutation<
      QuotationMutationResponse,
      UpdateQuotationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/quotations/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, _error, { id }) =>
        quotationMutationTags(quotationId(result?.data?.enquiryId), id),
    }),

    updateQuotationStatus: builder.mutation<
      QuotationMutationResponse,
      UpdateQuotationStatusRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/quotations/${id}/status`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, _error, { id }) =>
        quotationMutationTags(quotationId(result?.data?.enquiryId), id),
    }),

    acceptQuotation: builder.mutation<
      QuotationMutationResponse,
      AcceptQuotationRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/quotations/${id}/accept`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, _error, { id }) =>
        quotationMutationTags(quotationId(result?.data?.enquiryId), id),
    }),

    sendQuotationEmail: builder.mutation<
      QuotationMutationResponse,
      SendQuotationEmailRequest
    >({
      query: ({ id, from, to, cc, subject, body, attachment }) => {
        const formData = new FormData();
        if (from) formData.append("from", from);
        formData.append("to", to);
        if (cc) formData.append("cc", cc);
        if (subject) formData.append("subject", subject);
        if (body) formData.append("body", body);
        if (attachment) formData.append("attachment", attachment);
        return {
          url: `/v1/quotations/${id}/send-email`,
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: (result, _error, { id }) =>
        quotationMutationTags(quotationId(result?.data?.enquiryId), id),
    }),

    deleteQuotation: builder.mutation<QuotationDeleteResponse, string>({
      query: (id) => ({
        url: `/v1/quotations/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) =>
        quotationMutationTags(undefined, id),
    }),
  }),
});

export const {
  useGetQuotationsQuery,
  useGetQuotationByIdQuery,
  useGetQuotationSignatoriesQuery,
  useCreateQuotationMutation,
  useUpdateQuotationMutation,
  useUpdateQuotationStatusMutation,
  useAcceptQuotationMutation,
  useSendQuotationEmailMutation,
  useDeleteQuotationMutation,
} = quotationApiSlice;
