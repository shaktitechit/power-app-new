/**
 * Turn cleaned extraction output into structured text blocks for OpenRouter.
 * @param {import("./documentTextExtractor.js").DocumentExtractionResult} extraction
 * @param {string} cleanedText
 * @param {{ truncated?: boolean, originalLength?: number }} [meta]
 */
export function buildStructuredTextBlock(extraction, cleanedText, meta = {}) {
  const lines = [
    `document: ${extraction.fileName}`,
    `extraction: ${extraction.method}`,
    extraction.hasEmbeddedText != null
      ? `embedded_text: ${extraction.hasEmbeddedText}`
      : null,
    extraction.pageCount ? `pages: ${extraction.pageCount}` : null,
    extraction.ocrConfidence != null
      ? `ocr_confidence: ${Math.round(extraction.ocrConfidence)}`
      : null,
    meta.truncated
      ? `truncated: ${meta.originalLength} -> ${cleanedText.length} chars`
      : null,
  ].filter(Boolean);

  return [
    "--- STRUCTURED DOCUMENT TEXT ---",
    ...lines,
    "",
    cleanedText || "[no readable text extracted]",
    "--- END STRUCTURED DOCUMENT TEXT ---",
  ].join("\n");
}

/**
 * @param {string[]} blocks
 */
export function mergeStructuredTextBlocks(blocks) {
  return blocks.filter(Boolean).join("\n\n");
}
