const NOISE_LINE =
  /^[\s\d\-_|=+*#.:;,/\\()[\]{}]*$/;

/**
 * Normalize and de-noise extracted document text before sending to the LLM.
 * @param {string} raw
 * @returns {string}
 */
export function cleanDocumentText(raw = "") {
  if (!raw) return "";

  let text = String(raw)
    .replace(/\u0000/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[^\S\n]+/g, " ")
    .replace(/[ \u00A0]+\n/g, "\n")
    .replace(/\n[ \u00A0]+/g, "\n");

  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !NOISE_LINE.test(line));

  text = lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

/**
 * Trim text to a max length while keeping paragraph boundaries when possible.
 * @param {string} text
 * @param {number} maxChars
 * @returns {{ text: string, truncated: boolean, originalLength: number }}
 */
export function truncateDocumentText(text = "", maxChars = 15000) {
  const originalLength = text.length;

  if (!text || text.length <= maxChars) {
    return { text, truncated: false, originalLength };
  }

  const slice = text.slice(0, maxChars);
  const lastBreak = Math.max(
    slice.lastIndexOf("\n\n"),
    slice.lastIndexOf("\n"),
    slice.lastIndexOf(". "),
  );

  const safeCut = lastBreak > Math.floor(maxChars * 0.6) ? lastBreak : maxChars;
  const trimmed = text.slice(0, safeCut).trim();

  return {
    text: `${trimmed}\n\n[Document truncated: showing ${trimmed.length} of ${originalLength} characters.]`,
    truncated: true,
    originalLength,
  };
}
