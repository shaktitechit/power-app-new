import { apiSlice } from "./apiSlice";

export interface TermsConditionsUserRef {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface TermsConditions {
  _id: string;
  title: string;
  lines: string[];
  created_by?: string | TermsConditionsUserRef | null;
  updated_by?: string | TermsConditionsUserRef | null;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type TermsConditionsInput = {
  title: string;
  lines: string[];
};

export type UpdateTermsConditionsRequest = { id: string } & TermsConditionsInput;

export interface TermsConditionsListResponse {
  success: boolean;
  count: number;
  data: TermsConditions[];
}

export interface TermsConditionsDetailResponse {
  success: boolean;
  data: TermsConditions;
}

export interface TermsConditionsMutationResponse {
  success: boolean;
  message: string;
  data: TermsConditions;
}

export interface TermsConditionsDeleteResponse {
  success: boolean;
  message: string;
}

function termsListTags() {
  return [{ type: "TermsConditions" as const, id: "LIST" }];
}

export const termsConditionsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getTermsConditions: builder.query<TermsConditionsListResponse, void>({
      query: () => ({
        url: "/v1/terms-conditions",
        method: "GET",
      }),
      providesTags: (result) => [
        ...termsListTags(),
        ...(result?.data ?? []).map((term) => ({
          type: "TermsConditions" as const,
          id: term._id,
        })),
      ],
    }),

    getTermsConditionsById: builder.query<TermsConditionsDetailResponse, string>({
      query: (id) => ({
        url: `/v1/terms-conditions/${id}`,
        method: "GET",
      }),
      providesTags: (_result, _error, id) => [
        ...termsListTags(),
        { type: "TermsConditions", id },
      ],
    }),

    createTermsConditions: builder.mutation<
      TermsConditionsMutationResponse,
      TermsConditionsInput
    >({
      query: (body) => ({
        url: "/v1/terms-conditions",
        method: "POST",
        body,
      }),
      invalidatesTags: termsListTags,
    }),

    updateTermsConditions: builder.mutation<
      TermsConditionsMutationResponse,
      UpdateTermsConditionsRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/terms-conditions/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        ...termsListTags(),
        { type: "TermsConditions", id },
      ],
    }),

    deleteTermsConditions: builder.mutation<TermsConditionsDeleteResponse, string>({
      query: (id) => ({
        url: `/v1/terms-conditions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, id) => [
        ...termsListTags(),
        { type: "TermsConditions", id },
      ],
    }),
  }),
});

export const {
  useGetTermsConditionsQuery,
  useGetTermsConditionsByIdQuery,
  useCreateTermsConditionsMutation,
  useUpdateTermsConditionsMutation,
  useDeleteTermsConditionsMutation,
} = termsConditionsApiSlice;
