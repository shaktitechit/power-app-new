import dotenv from "dotenv";

dotenv.config();

/**
 * OpenRouter API Key for authenticating requests.
 */
export const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || "";

/**
 * OpenRouter Model identifier (defaults to google/gemini-2.5-flash).
 */
export const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";

/**
 * Base URL for OpenRouter API requests.
 */
export const OPENROUTER_BASE_URL = process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";

/** Max characters of extracted document text sent to the LLM (per request). */
export const OPENROUTER_MAX_DOCUMENT_CHARS = Number(
  process.env.OPENROUTER_MAX_DOCUMENT_CHARS || 15000,
);

/** Minimum extracted PDF text length before treating PDF as scanned (cloud OCR). */
export const OPENROUTER_MIN_PDF_TEXT_CHARS = Number(
  process.env.OPENROUTER_MIN_PDF_TEXT_CHARS || 80,
);

/**
 * Validates the OpenRouter configuration in production.
 */
export function assertOpenRouterConfig() {
  if (process.env.NODE_ENV !== "production") return;

  if (!OPENROUTER_API_KEY) {
    console.warn(
      "[openrouter] OPENROUTER_API_KEY is empty — OpenRouter features will fail in production.",
    );
  }
}
