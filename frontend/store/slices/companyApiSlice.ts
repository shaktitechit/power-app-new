import { apiSlice } from "./apiSlice";

export interface CompanyUserRef {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface CompanyBranchOffice {
  _id?: string;
  name: string;
  gstin: string;
  cin: string;
  pan: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  is_head_office: boolean;
}

export interface Company {
  _id: string;
  legal_name: string;
  trade_name: string;
  tagline: string;
  gstin: string;
  cin: string;
  pan: string;
  drug_license: string;
  fssai_license: string;
  email: string;
  billing_email: string;
  phone: string;
  website: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  theme_palette: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  branch_offices: CompanyBranchOffice[];
  currency: string;
  timezone: string;
  financial_year: string;
  invoice_footer_note: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  ifsc_code: string;
  branch_name: string;
  account_type: string;
  upi_id: string;
  swift_code: string;
  is_default: boolean;
  updated_by?: string | CompanyUserRef | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type CompanyWritableFields = Omit<
  Company,
  "_id" | "updated_by" | "deleted_at" | "created_at" | "updated_at"
>;

export type CreateCompanyRequest = Partial<CompanyWritableFields> & {
  logo?: File;
  favicon?: File;
};

export type UpdateCompanyRequest = { id: string } & Partial<CompanyWritableFields> & {
  logo?: File;
  favicon?: File;
};

function buildCompanyFormData(
  body: Partial<CompanyWritableFields> & { logo?: File; favicon?: File },
) {
  const formData = new FormData();

  for (const [key, value] of Object.entries(body)) {
    if (key === "logo" || key === "favicon" || value === undefined || value === null) {
      continue;
    }
    if (key === "branch_offices") {
      formData.append(key, JSON.stringify(value));
      continue;
    }
    if (typeof value === "boolean") {
      formData.append(key, value ? "true" : "false");
      continue;
    }
    formData.append(key, String(value));
  }

  if (body.logo) formData.append("logo", body.logo);
  if (body.favicon) formData.append("favicon", body.favicon);

  return formData;
}

export interface CompanyListResponse {
  success: boolean;
  count: number;
  data: Company[];
}

export interface CompanyDetailResponse {
  success: boolean;
  data: Company;
}

export interface CompanyMutationResponse {
  success: boolean;
  message: string;
  data: Company;
}

export interface CompanyDeleteResponse {
  success: boolean;
  message: string;
}

export interface CompanyBrandingResponse {
  success: boolean;
  data: {
    legal_name?: string;
    trade_name?: string;
    logo_url?: string;
    favicon_url?: string;
    primary_color?: string;
    secondary_color?: string;
    theme_palette?: string;
    updated_at?: string;
  };
}

function companyListTags() {
  return [
    { type: "Company" as const, id: "LIST" },
    { type: "Company" as const, id: "DEFAULT" },
    { type: "Company" as const, id: "BRANDING" },
  ];
}

export const companyApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getCompanyBranding: builder.query<CompanyBrandingResponse, void>({
      query: () => ({
        url: "/v1/companies/branding",
        method: "GET",
      }),
      providesTags: [{ type: "Company", id: "BRANDING" }],
    }),

    getCompanies: builder.query<CompanyListResponse, void>({
      query: () => ({
        url: "/v1/companies",
        method: "GET",
      }),
      providesTags: (result) => [
        ...companyListTags(),
        ...(result?.data ?? []).map((company) => ({
          type: "Company" as const,
          id: company._id,
        })),
      ],
    }),

    getDefaultCompany: builder.query<CompanyDetailResponse, void>({
      query: () => ({
        url: "/v1/companies/default",
        method: "GET",
      }),
      providesTags: (result) => [
        { type: "Company", id: "DEFAULT" },
        ...(result?.data?._id ? [{ type: "Company" as const, id: result.data._id }] : []),
      ],
    }),

    getCompanyById: builder.query<CompanyDetailResponse, string>({
      query: (id) => ({
        url: `/v1/companies/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [
        ...companyListTags(),
        { type: "Company", id },
      ],
    }),

    createCompany: builder.mutation<CompanyMutationResponse, CreateCompanyRequest>({
      query: (body) => ({
        url: "/v1/companies",
        method: "POST",
        body: body.logo || body.favicon ? buildCompanyFormData(body) : body,
      }),
      invalidatesTags: companyListTags,
    }),

    updateCompany: builder.mutation<CompanyMutationResponse, UpdateCompanyRequest>({
      query: ({ id, ...body }) => ({
        url: `/v1/companies/${id}`,
        method: "PUT",
        body: body.logo || body.favicon ? buildCompanyFormData(body) : body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        ...companyListTags(),
        { type: "Company", id },
      ],
    }),

    setDefaultCompany: builder.mutation<CompanyMutationResponse, string>({
      query: (id) => ({
        url: `/v1/companies/${id}/default`,
        method: "PUT",
      }),
      invalidatesTags: (_result, _error, id) => [
        ...companyListTags(),
        { type: "Company", id },
      ],
    }),

    deleteCompany: builder.mutation<CompanyDeleteResponse, string>({
      query: (id) => ({
        url: `/v1/companies/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        ...companyListTags(),
        { type: "Company", id },
      ],
    }),
  }),
});

export const {
  useGetCompanyBrandingQuery,
  useGetCompaniesQuery,
  useGetDefaultCompanyQuery,
  useGetCompanyByIdQuery,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useSetDefaultCompanyMutation,
  useDeleteCompanyMutation,
} = companyApiSlice;
