import { apiSlice } from "./apiSlice";

export interface GraphMailSender {
  name: string;
  email: string;
}

export interface GraphMailSendersResponse {
  success: boolean;
  configured: boolean;
  mailbox?: string | null;
  count: number;
  data: GraphMailSender[];
}

export const messageApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGraphMailSenders: builder.query<GraphMailSendersResponse, void>({
      query: () => ({
        url: "/v1/messages/graph/senders",
        method: "GET",
      }),
    }),
  }),
});

export const { useGetGraphMailSendersQuery } = messageApiSlice;
