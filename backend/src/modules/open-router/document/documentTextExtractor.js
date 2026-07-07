import { OPENROUTER_MIN_PDF_TEXT_CHARS } from "../../../config/openRouter.js";
import {
  DOCUMENT_OCR_MAX_PDF_PAGES,
  DOCUMENT_PDF_RENDER_DPI,
} from "../../../config/documentExtraction.js";
import { mergeExtractedText } from "./mergeExtractedText.js";
import {
  extractEmbeddedPdfTextWithPositions,
  renderPdfPagesAtDpi,
} from "./pdfJsDocument.js";
import { tesseractOcrImage, tesseractOcrPages } from "./ocr/tesseractOcr.js";
import { resolveDocumentMimeType } from "./resolveDocumentMimeType.js";

/**
 * @typedef {Object} DocumentExtractionResult
 * @property {string} text
 * @property {"pdfjs-embedded" | "pdfjs+tesseract" | "tesseract-ocr"} method
 * @property {string} fileName
 * @property {string} mimeType
 * @property {number} [pageCount]
 * @property {boolean} hasEmbeddedText
 * @property {number} [ocrConfidence]
 */

function hasEnoughEmbeddedText(text, minChars) {
  return text.trim().length >= minChars;
}

/**
 * Power App → Backend
 * pdfjs-dist (embedded text + positions) → optional 300 DPI render → Tesseract → merge
 *
 * @param {{ buffer: Buffer, originalname?: string, mimetype: string }} file
 * @param {{ minPdfTextChars?: number, renderDpi?: number, maxPdfPages?: number }} [options]
 * @returns {Promise<DocumentExtractionResult>}
 */
export async function extractTextFromFile(file, options = {}) {
  const minPdfTextChars = options.minPdfTextChars ?? OPENROUTER_MIN_PDF_TEXT_CHARS;
  const renderDpi = options.renderDpi ?? DOCUMENT_PDF_RENDER_DPI;
  const maxPdfPages = options.maxPdfPages ?? DOCUMENT_OCR_MAX_PDF_PAGES;
  const fileName = file.originalname || "document";
  const mimeType = resolveDocumentMimeType(file);

  if (mimeType === "application/pdf") {
    const embedded = await extractEmbeddedPdfTextWithPositions(file.buffer);

    if (hasEnoughEmbeddedText(embedded.text, minPdfTextChars)) {
      return {
        text: embedded.text,
        method: "pdfjs-embedded",
        fileName,
        mimeType,
        pageCount: embedded.pageCount,
        hasEmbeddedText: true,
      };
    }

    const pageImages = await renderPdfPagesAtDpi(
      file.buffer,
      renderDpi,
      maxPdfPages,
    );
    const ocr = await tesseractOcrPages(pageImages);
    const merged = mergeExtractedText(embedded.text, ocr.text);

    return {
      text: merged,
      method: "pdfjs+tesseract",
      fileName,
      mimeType,
      pageCount: embedded.pageCount,
      hasEmbeddedText: false,
      ocrConfidence: ocr.confidence,
    };
  }

  if (mimeType.startsWith("image/")) {
    const ocr = await tesseractOcrImage(file.buffer);

    return {
      text: ocr.text,
      method: "tesseract-ocr",
      fileName,
      mimeType,
      hasEmbeddedText: false,
      ocrConfidence: ocr.confidence,
    };
  }

  throw new Error(`Unsupported document type: ${mimeType}`);
}
