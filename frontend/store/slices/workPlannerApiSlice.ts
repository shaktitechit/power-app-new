import { apiSlice } from "./apiSlice";

export interface WorkPlanPeriod {
  type: "daily" | "weekly" | "monthly" | "quarterly" | "custom";
  startDate: string;
  endDate: string;
}

export interface VisitItem {
  _id?: string;
  facility?: { _id: string; name: string; city: string; address?: string } | null;
  facilityName?: string;
  location?: string;
  clientName?: string;
  clientContactNumber?: string;
  clientEmail?: string;
  purpose?: string;
  expectedOutcome?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  checkInTime?: string | null;
  checkOutTime?: string | null;
  notes?: string;
}

export interface WorkItem {
  _id?: string;
  title: string;
  description?: string;
  category?: string;
  estimatedHours?: number;
  status: "pending" | "in_progress" | "completed";
  notes?: string;
}

export interface WorkPlanApproval {
  requiredFrom?: { _id: string; name: string; role: string } | null;
  approvedBy?: { _id: string; name: string } | null;
  approvedAt?: string | null;
  rejectedBy?: { _id: string; name: string } | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
}

export interface WorkPlan {
  _id: string;
  owner: { _id: string; name: string; email: string; role: string };
  created_by: { _id: string; name: string; email: string };
  title: string;
  description: string;
  planType: "visits" | "work_from_office" | "work_from_home" | "leave";
  date: string;
  leaveReason?: string;
  visits?: VisitItem[];
  works?: WorkItem[];
  expenses?: any[];
  period: WorkPlanPeriod;
  status: "draft" | "submitted" | "approved" | "rejected" | "active" | "completed" | "cancelled";
  approval: WorkPlanApproval;
  created_at: string;
  updated_at: string;
}

export interface WorkTask {
  _id: string;
  workPlanId?: { _id: string; title: string; period: WorkPlanPeriod; status: string } | null;
  title: string;
  description: string;
  taskType: string;
  assignedTo: { _id: string; name: string; email: string; role: string };
  assignedBy: { _id: string; name: string; email: string };
  facilityId?: { _id: string; name: string; city: string } | null;
  priority: "low" | "medium" | "high" | "critical";
  startDate?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  status: "draft" | "assigned" | "in_progress" | "completed" | "overdue" | "cancelled";
  completion: {
    completedAt?: string | null;
    completedBy?: { _id: string; name: string } | null;
    remarks?: string | null;
    actualMinutes?: number | null;
  };
  created_at: string;
  updated_at: string;
}

export interface WorkPlannerDashboard {
  plans: Record<string, number>;
  tasks: Record<string, number>;
  totalPlans: number;
  totalTasks: number;
}

const tag = (type: "WorkPlan" | "WorkTask", id?: string) =>
  id ? { type, id } : type;

export const workPlannerApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getWorkPlannerDashboard: builder.query<WorkPlannerDashboard, void>({
      query: () => "/v1/work-plans/dashboard",
      providesTags: ["WorkPlan", "WorkTask"],
    }),

    getWorkPlans: builder.query<{ plans: WorkPlan[]; total: number; page: number; limit: number }, {
      status?: string; ownerId?: string; planType?: string; tab?: string; startDate?: string; endDate?: string; page?: number; limit?: number;
    }>({
      query: (params) => ({ url: "/v1/work-plans", params }),
      providesTags: ["WorkPlan"],
    }),

    getWorkPlan: builder.query<WorkPlan, string>({
      query: (id) => `/v1/work-plans/${id}`,
      providesTags: (r, e, id) => [{ type: "WorkPlan", id }, "Expense"],
    }),

    createWorkPlan: builder.mutation<{ message: string; plan: WorkPlan }, Partial<WorkPlan> & { period: WorkPlanPeriod; ownerId?: string }>({
      query: (body) => ({ url: "/v1/work-plans", method: "POST", body }),
      invalidatesTags: ["WorkPlan"],
    }),

    updateWorkPlan: builder.mutation<{ message: string; plan: WorkPlan }, { id: string } & Partial<WorkPlan>>({
      query: ({ id, ...body }) => ({ url: `/v1/work-plans/${id}`, method: "PUT", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "WorkPlan", id }, "WorkPlan"],
    }),

    deleteWorkPlan: builder.mutation<{ message: string }, string>({
      query: (id) => ({ url: `/v1/work-plans/${id}`, method: "DELETE" }),
      invalidatesTags: ["WorkPlan"],
    }),

    submitWorkPlan: builder.mutation<{ message: string; plan: WorkPlan }, string>({
      query: (id) => ({ url: `/v1/work-plans/${id}/submit`, method: "POST" }),
      invalidatesTags: (r, e, id) => [{ type: "WorkPlan", id }, "WorkPlan"],
    }),

    approveWorkPlan: builder.mutation<{ message: string; plan: WorkPlan }, { id: string; remarks?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/work-plans/${id}/approve`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "WorkPlan", id }, "WorkPlan"],
    }),

    rejectWorkPlan: builder.mutation<{ message: string; plan: WorkPlan }, { id: string; reason?: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/work-plans/${id}/reject`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "WorkPlan", id }, "WorkPlan"],
    }),

    completeWorkPlan: builder.mutation<{ message: string; plan: WorkPlan }, string>({
      query: (id) => ({ url: `/v1/work-plans/${id}/complete`, method: "POST" }),
      invalidatesTags: (r, e, id) => [{ type: "WorkPlan", id }, "WorkPlan"],
    }),

    cancelWorkPlan: builder.mutation<{ message: string; plan: WorkPlan }, string>({
      query: (id) => ({ url: `/v1/work-plans/${id}/cancel`, method: "POST" }),
      invalidatesTags: (r, e, id) => [{ type: "WorkPlan", id }, "WorkPlan"],
    }),

    // Work Tasks
    getWorkTasks: builder.query<{ tasks: WorkTask[]; total: number; page: number; limit: number }, {
      status?: string; assignedTo?: string; workPlanId?: string; page?: number; limit?: number;
    }>({
      query: (params) => ({ url: "/v1/work-tasks", params }),
      providesTags: ["WorkTask"],
    }),

    getWorkTask: builder.query<WorkTask, string>({
      query: (id) => `/v1/work-tasks/${id}`,
      providesTags: (r, e, id) => [{ type: "WorkTask", id }],
    }),

    createWorkTask: builder.mutation<{ message: string; task: WorkTask }, Partial<WorkTask> & { assignedTo: string }>({
      query: (body) => ({ url: "/v1/work-tasks", method: "POST", body }),
      invalidatesTags: ["WorkTask"],
    }),

    updateWorkTask: builder.mutation<{ message: string; task: WorkTask }, { id: string } & Partial<WorkTask>>({
      query: ({ id, ...body }) => ({ url: `/v1/work-tasks/${id}`, method: "PUT", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "WorkTask", id }, "WorkTask"],
    }),

    completeWorkTask: builder.mutation<{ message: string; task: WorkTask }, { id: string; remarks?: string; actualMinutes?: number }>({
      query: ({ id, ...body }) => ({ url: `/v1/work-tasks/${id}/complete`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "WorkTask", id }, "WorkTask"],
    }),

    reassignWorkTask: builder.mutation<{ message: string; task: WorkTask }, { id: string; newAssigneeId: string }>({
      query: ({ id, ...body }) => ({ url: `/v1/work-tasks/${id}/assign`, method: "POST", body }),
      invalidatesTags: (r, e, { id }) => [{ type: "WorkTask", id }, "WorkTask"],
    }),
  }),
});

export const {
  useGetWorkPlannerDashboardQuery,
  useGetWorkPlansQuery,
  useGetWorkPlanQuery,
  useCreateWorkPlanMutation,
  useUpdateWorkPlanMutation,
  useDeleteWorkPlanMutation,
  useSubmitWorkPlanMutation,
  useApproveWorkPlanMutation,
  useRejectWorkPlanMutation,
  useCompleteWorkPlanMutation,
  useCancelWorkPlanMutation,
  useGetWorkTasksQuery,
  useGetWorkTaskQuery,
  useCreateWorkTaskMutation,
  useUpdateWorkTaskMutation,
  useCompleteWorkTaskMutation,
  useReassignWorkTaskMutation,
} = workPlannerApiSlice;
