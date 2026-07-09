import { OPENROUTER_MIN_PDF_TEXT_CHARS } from "../../../config/openRouter.js";
import {
  DOCUMENT_BILL_OCR_LANGUAGE,
  DOCUMENT_BILL_OCR_MAX_PAGES,
  DOCUMENT_BILL_RENDER_DPI,
  DOCUMENT_OCR_LANGUAGE,
  DOCUMENT_OCR_MAX_PDF_PAGES,
  DOCUMENT_PDF_RENDER_DPI,
} from "../../../config/documentExtraction.js";
import { mergeExtractedText } from "./mergeExtractedText.js";
import { processPdfDocument } from "./pdfJsDocument.js";
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

function resolveOcrLanguage(options = {}) {
  if (options.ocrLanguage) return options.ocrLanguage;
  if (options.billMode) return DOCUMENT_BILL_OCR_LANGUAGE;
  return DOCUMENT_OCR_LANGUAGE;
}

/**
 * @param {{ buffer: Buffer, originalname?: string, mimetype: string }} file
 * @param {{ minPdfTextChars?: number, renderDpi?: number, maxPdfPages?: number, billMode?: boolean, ocrLanguage?: string }} [options]
 */
export async function extractTextFromFile(file, options = {}) {
  const billMode = options.billMode === true;
  const minPdfTextChars = options.minPdfTextChars ?? OPENROUTER_MIN_PDF_TEXT_CHARS;
  const renderDpi = options.renderDpi
    ?? (billMode ? DOCUMENT_BILL_RENDER_DPI : DOCUMENT_PDF_RENDER_DPI);
  const maxPdfPages = options.maxPdfPages
    ?? (billMode ? DOCUMENT_BILL_OCR_MAX_PAGES : DOCUMENT_OCR_MAX_PDF_PAGES);
  const ocrLanguage = resolveOcrLanguage(options);
  const fileName = file.originalname || "document";
  const mimeType = resolveDocumentMimeType(file);

  if (mimeType === "application/pdf") {
    const pdf = await processPdfDocument(file.buffer, {
      minChars: minPdfTextChars,
      dpi: renderDpi,
      maxPages: maxPdfPages,
    });

    if (pdf.hasEmbeddedText) {
      return {
        text: pdf.text,
        method: "pdfjs-embedded",
        fileName,
        mimeType,
        pageCount: pdf.pageCount,
        hasEmbeddedText: true,
      };
    }

    const ocr = await tesseractOcrPages(pdf.ocrImages ?? [], ocrLanguage);
    const merged = mergeExtractedText(pdf.text, ocr.text);

    return {
      text: merged,
      method: "pdfjs+tesseract",
      fileName,
      mimeType,
      pageCount: pdf.pageCount,
      hasEmbeddedText: false,
      ocrConfidence: ocr.confidence,
    };
  }

  if (mimeType.startsWith("image/")) {
    const ocr = await tesseractOcrImage(file.buffer, null, ocrLanguage);

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
