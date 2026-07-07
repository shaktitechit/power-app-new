/**
 * Merge embedded pdf.js text and Tesseract OCR output.
 * When OCR ran due to sparse embedded text, OCR is primary.
 * @param {string} embeddedText
 * @param {string} ocrText
 */
export function mergeExtractedText(embeddedText = "", ocrText = "") {
  const embedded = embeddedText.trim();
  const ocr = ocrText.trim();

  if (ocr && embedded) {
    return `${ocr}\n\n--- Embedded text (partial) ---\n${embedded}`;
  }

  return ocr || embedded;
}
