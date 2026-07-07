import { apiSlice } from "./apiSlice";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  extraParams?: Record<string, any>;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  options?: ChatCompletionOptions;
}

export interface ChatCompletionResponse {
  id: string;
  choices: Array<{
    message: ChatMessage;
    finish_reason: string;
  }>;
  [key: string]: any;
}

export interface TextGenerationRequest {
  prompt: string;
  options?: ChatCompletionOptions;
}

export interface TextGenerationResponse {
  content: string;
}

export const openRouterApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    chatCompletion: builder.mutation<ChatCompletionResponse, ChatCompletionRequest>({
      query: (body) => ({
        url: "/v1/open-router/chat",
        method: "POST",
        body,
      }),
    }),
    generateText: builder.mutation<TextGenerationResponse, TextGenerationRequest>({
      query: (body) => ({
        url: "/v1/open-router/generate",
        method: "POST",
        body,
      }),
    }),
    chatWithFile: builder.mutation<ChatCompletionResponse, FormData>({
      query: (body) => ({
        url: "/v1/open-router/chat-with-file",
        method: "POST",
        body,
      }),
    }),
    parseUtilityBill: builder.mutation<Record<string, any>, FormData>({
      query: (body) => ({
        url: "/v1/open-router/parse-utility-bill",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useChatCompletionMutation,
  useGenerateTextMutation,
  useChatWithFileMutation,
  useParseUtilityBillMutation,
} = openRouterApiSlice;
