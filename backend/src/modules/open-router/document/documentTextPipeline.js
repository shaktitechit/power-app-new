import { OPENROUTER_MAX_DOCUMENT_CHARS } from "../../../config/openRouter.js";
import { cleanDocumentText, truncateDocumentText } from "./documentTextCleaner.js";
import { extractTextFromFile } from "./documentTextExtractor.js";
import {
  buildStructuredTextBlock,
  mergeStructuredTextBlocks,
} from "./documentStructuredText.js";

/**
 * Extract → clean → structure text for OpenRouter prompts.
 * @param {Array<{ buffer: Buffer, originalname?: string, mimetype: string }>} files
 * @param {{ maxChars?: number, maxCharsPerFile?: number }} [options]
 */
export async function buildDocumentTextContext(files = [], options = {}) {
  const maxTotalChars = options.maxChars ?? OPENROUTER_MAX_DOCUMENT_CHARS;
  const perFileBudget =
    options.maxCharsPerFile ??
    Math.max(2000, Math.floor(maxTotalChars / Math.max(files.length, 1)));

  const extractions = [];
  const blocks = [];
  const warnings = [];

  for (const file of files) {
    try {
      const extraction = await extractTextFromFile(file, options);
      extractions.push(extraction);

      if (
        !extraction.hasEmbeddedText &&
        (extraction.method === "pdfjs+tesseract" || extraction.method === "tesseract-ocr")
      ) {
        if (!extraction.text?.trim()) {
          warnings.push(`${extraction.fileName}: Tesseract OCR returned no readable text.`);
        }
      }

      const cleaned = cleanDocumentText(extraction.text);
      const bounded = truncateDocumentText(cleaned, perFileBudget);
      blocks.push(
        buildStructuredTextBlock(extraction, bounded.text, {
          truncated: bounded.truncated,
          originalLength: bounded.originalLength,
        }),
      );
    } catch (error) {
      warnings.push(
        `${file.originalname || "document"}: extraction failed (${error.message}).`,
      );
      blocks.push(
        buildStructuredTextBlock(
          {
            fileName: file.originalname || "document",
            method: "failed",
            mimeType: file.mimetype,
            text: "",
            hasEmbeddedText: false,
          },
          "[Unable to extract text from this file.]",
        ),
      );
    }
  }

  const merged = mergeStructuredTextBlocks(blocks);
  const { text: context } = truncateDocumentText(merged, maxTotalChars);
  const hasReadableText = extractions.some(
    (item) => item.text?.trim() || cleanDocumentText(item.text).length > 0,
  );

  return {
    context,
    extractions,
    warnings,
    hasReadableText,
  };
}
