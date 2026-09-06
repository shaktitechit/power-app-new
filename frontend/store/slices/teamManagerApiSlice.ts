import { apiSlice } from "./apiSlice";

export interface TeamUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  reportsTo?: { _id: string; name: string; email: string; role: string } | null;
  teamRoot?: { _id: string; name: string; role?: string; email?: string; description?: string; lead?: any } | null;
}

export interface OrgNode extends TeamUser {
  teamId?: string;
  description?: string;
  lead?: { _id: string; name: string; role: string; email: string; status?: string } | null;
  children: OrgNode[];
}

export interface TeamUsersResponse {
  users: TeamUser[];
  total: number;
  page: number;
  limit: number;
}

export interface TeamReportGroup {
  id: string;
  name: string;
  teamLead?: { _id: string; name: string; role: string; email: string } | null;
  total: number;
  byRole: Record<string, number>;
  active: number;
  inactive: number;
}

export interface TeamReportResponse {
  summary: {
    total: number;
    byRole: Record<string, number>;
    byStatus: { active: number; inactive: number };
    teams?: Record<string, TeamReportGroup>;
  };
  users: TeamUser[];
}

export const teamManagerApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrgHierarchy: builder.query<OrgNode[], void>({
      query: () => "/v1/team/hierarchy",
      providesTags: ["TeamHierarchy"],
    }),

    getTeamUsers: builder.query<TeamUsersResponse, {
      role?: string;
      search?: string;
      managerId?: string;
      teamRootId?: string;
      page?: number;
      limit?: number;
    }>({
      query: (params) => ({
        url: "/v1/team/users",
        params,
      }),
      providesTags: ["TeamHierarchy"],
    }),

    getTeamUserDetail: builder.query<{ user: TeamUser; directReports: TeamUser[] }, string>({
      query: (id) => `/v1/team/users/${id}`,
      providesTags: (result, error, id) => [{ type: "TeamHierarchy", id }],
    }),

    assignUser: builder.mutation<{ message: string; user: TeamUser }, { id: string; newManagerId: string | null }>({
      query: ({ id, newManagerId }) => ({
        url: `/v1/team/users/${id}/assign`,
        method: "PUT",
        body: { newManagerId },
      }),
      invalidatesTags: ["TeamHierarchy", "User"],
    }),

    moveUser: builder.mutation<{ message: string; user: TeamUser }, { id: string; newManagerId: string }>({
      query: ({ id, newManagerId }) => ({
        url: `/v1/team/users/${id}/move`,
        method: "PUT",
        body: { newManagerId },
      }),
      invalidatesTags: ["TeamHierarchy", "User"],
    }),

    activateUser: builder.mutation<{ message: string; user: TeamUser }, string>({
      query: (id) => ({
        url: `/v1/team/users/${id}/activate`,
        method: "PUT",
      }),
      invalidatesTags: ["TeamHierarchy", "User"],
    }),

    deactivateUser: builder.mutation<{ message: string; user: TeamUser }, string>({
      query: (id) => ({
        url: `/v1/team/users/${id}/deactivate`,
        method: "PUT",
      }),
      invalidatesTags: ["TeamHierarchy", "User"],
    }),

    createTeam: builder.mutation<
      { message: string; assignedMembersCount: number; errors?: string[] },
      {
        name?: string;
        description?: string;
        teamLeadId: string;
        memberIds?: string[];
        members?: { userId: string; reportsToId: string }[];
      }
    >({
      query: (body) => ({
        url: "/v1/team/create",
        method: "POST",
        body,
      }),
      invalidatesTags: ["TeamHierarchy", "User"],
    }),

    updateTeam: builder.mutation<
      { message: string; team: any },
      {
        id: string;
        name?: string;
        description?: string;
        newLeadId?: string;
        teamLeadId?: string;
        members?: { userId: string; reportsToId: string }[];
      }
    >({
      query: ({ id, ...body }) => ({
        url: `/v1/team/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["TeamHierarchy", "User"],
    }),

    deleteTeam: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/v1/team/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["TeamHierarchy", "User"],
    }),

    getTeamReport: builder.query<TeamReportResponse, void>({
      query: () => "/v1/team/reports",
      providesTags: ["TeamHierarchy"],
    }),
  }),
});

export const {
  useGetOrgHierarchyQuery,
  useGetTeamUsersQuery,
  useGetTeamUserDetailQuery,
  useAssignUserMutation,
  useMoveUserMutation,
  useCreateTeamMutation,
  useUpdateTeamMutation,
  useDeleteTeamMutation,
  useActivateUserMutation,
  useDeactivateUserMutation,
  useGetTeamReportQuery,
} = teamManagerApiSlice;
