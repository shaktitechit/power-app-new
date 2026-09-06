import { apiSlice } from "./apiSlice";

export type ExpenseStatus = "draft" | "submitted" | "under_review" | "approved" | "rejected" | "reimbursed" | "cancelled";
export type ExpenseCategory = "travel" | "accommodation" | "food" | "communication" | "client_entertainment" | "marketing" | "office" | "miscellaneous";

export interface ExpenseApproval {
  requiredFrom?: { _id: string; name: string; email: string; role: string } | null;
  approvalLevel?: string | null;
  approvedBy?: { _id: string; name: string } | null;
  approvedAt?: string | null;
  rejectedBy?: { _id: string; name: string } | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

export interface Expense {
  _id: string;
  employeeId: { _id: string; name: string; email: string; role: string };
  workPlanId?: { _id: string; title: string } | null;
  taskId?: { _id: string; title: string } | null;
  facilityId?: { _id: string; name: string; city: string } | null;
  expenseDate: string;
  category: ExpenseCategory;
  subcategory?: string | null;
  amount: number;
  description: string;
  receiptUrl?: string | null;
  status: ExpenseStatus;
  approval: ExpenseApproval;
  reimbursement: {
    status: "pending" | "processing" | "completed";
    processedAt?: string | null;
    reference?: string | null;
  };
  created_at: string;
  updated_at: string;
}

export interface ExpensePolicyRule {
  maxAmount: number | null;
  approverRole: "manager" | "admin" | "super_admin";
  approvalLevel: number;
  label?: string;
}

export interface ExpensePolicy {
  _id: string;
  name: string;
  description: string;
  rules: ExpensePolicyRule[];
  isDefault: boolean;
  isActive: boolean;
}

export interface ExpenseDashboard {
  summary: Record<string, { count: number; totalAmount: number }>;
  totalAmount: number;
  totalExpenses: number;
}

export const expenseManagerApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getExpenseDashboard: builder.query<ExpenseDashboard, void>({
      query: () => "/v1/expenses/dashboard",
      providesTags: ["Expense"],
    }),

    getExpenseReports: builder.query<Array<{ _id: string; count: number; totalAmount: number; approvedAmount: number; pendingAmount: number }>, {
      groupBy?: string; startDate?: string; endDate?: string;
    }>({
      query: (params) => ({ url: "/v1/expenses/reports", params }),
      providesTags: ["Expense"],
    }),

    getExpenses: builder.query<{ expenses: Expense[]; total: number; page: number; limit: number }, {
      status?: string; employeeId?: string; category?: string; tab?: string;
      startDate?: string; endDate?: string; page?: number; limit?: number;
    }>({
      query: (params) => ({ url: "/v1/expenses", params }),
      providesTags: ["Expense"],
    }),

    getExpense: builder.query<Expense, string>({
      query: (id) => `/v1/expenses/${id}`,
      providesTags: (r, e, id) => [{ type: "Expense", id }],
    }),

    createExpense: builder.mutation<{ message: string; expense: Expense }, {
      employeeId?: string; workPlanId?: string; taskId?: string; visitId?: string; facilityId?: string;
      expenseDate: string; category: ExpenseCategory; subcategory?: string;
      amount: number; description: string; receiptUrl?: string;
    }>({
      query: (body) => ({ url: "/v1/expenses", method: "POST", body }),
      invalidatesTags: ["Expense"],
    }),

    updateExpense: builder.mutation<{ message: string; expense: Expense }, { id: string } & Partial<Expense>>({
      query: ({ id, ...body }) => ({ url: `/v1/expenses/${id}`, method: "PUT", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Expense", id }, "Expense"],
    }),

    deleteExpense: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/v1/expenses/${id}`, method: "DELETE" }),
      invalidatesTags: ["Expense"],
    }),

    submitExpense: builder.mutation<{ message: string; expense: Expense }, string>({
      query: (id) => ({ url: `/v1/expenses/${id}/submit`, method: "POST" }),
      invalidatesTags: (r, e, id) => [{ type: "Expense", id }, "Expense"],
    }),

    approveExpense: builder.mutation<{ message: string; expense: Expense }, { id: string; remarks?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/expenses/${id}/approve`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Expense", id }, "Expense"],
    }),

    rejectExpense: builder.mutation<{ message: string; expense: Expense }, { id: string; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/expenses/${id}/reject`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Expense", id }, "Expense"],
    }),

    reimburseExpense: builder.mutation<{ message: string; expense: Expense }, { id: string; reference?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/expenses/${id}/reimburse`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "Expense", id }, "Expense"],
    }),

    getExpensePolicies: builder.query<ExpensePolicy[], void>({
      query: () => "/v1/expense-policies",
      providesTags: ["ExpensePolicy"],
    }),

    createExpensePolicy: builder.mutation<{ message: string; policy: ExpensePolicy }, Partial<ExpensePolicy>>({
      query: (body) => ({ url: "/v1/expense-policies", method: "POST", body }),
      invalidatesTags: ["ExpensePolicy"],
    }),

    updateExpensePolicy: builder.mutation<{ message: string; policy: ExpensePolicy }, { id: string } & Partial<ExpensePolicy>>({
      query: ({ id, ...body }) => ({ url: `/v1/expense-policies/${id}`, method: "PUT", body }),
      invalidatesTags: ["ExpensePolicy"],
    }),
  }),
});

export const {
  useGetExpenseDashboardQuery,
  useGetExpenseReportsQuery,
  useGetExpensesQuery,
  useGetExpenseQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useSubmitExpenseMutation,
  useApproveExpenseMutation,
  useRejectExpenseMutation,
  useReimburseExpenseMutation,
  useGetExpensePoliciesQuery,
  useCreateExpensePolicyMutation,
  useUpdateExpensePolicyMutation,
} = expenseManagerApiSlice;
