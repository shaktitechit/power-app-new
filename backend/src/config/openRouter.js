import dotenv from "dotenv";

dotenv.config();

/**
 * OpenRouter API Key for authenticating requests.
 */
export const OPENROUTER_API_KEY = process.env.OPENAI_API_KEY || "";

/**
 * OpenAI Model identifier (defaults to gpt-4o-mini).
 */
export const OPENROUTER_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Base URL for OpenAI API requests.
 */
export const OPENROUTER_BASE_URL = "https://api.openai.com/v1";

/** Max characters of extracted document text sent to the LLM (per request). */
export const OPENROUTER_MAX_DOCUMENT_CHARS = Number(
  process.env.OPENROUTER_MAX_DOCUMENT_CHARS || 15000,
);

/** Minimum extracted PDF text length before flagging sparse/scanned content. */
export const OPENROUTER_MIN_PDF_TEXT_CHARS = Number(
  process.env.OPENROUTER_MIN_PDF_TEXT_CHARS || 80,
);

/** Tesseract OCR language code (e.g. eng, hin, eng+hin). */
export const OPENROUTER_OCR_LANGUAGE = process.env.OPENROUTER_OCR_LANGUAGE || "eng";

/**
 * Validates the OpenAI configuration in production.
 */
export function assertOpenRouterConfig() {
  if (process.env.NODE_ENV !== "production") return;

  if (!process.env.OPENAI_API_KEY) {
    console.warn(
      "[openai] OPENAI_API_KEY is empty — OpenAI features will fail in production.",
    );
  }
}
