import { createRequire } from "node:module";
import path from "node:path";
import { createCanvas } from "canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const require = createRequire(import.meta.url);
const pdfjsPath = path.dirname(require.resolve("pdfjs-dist/package.json"));

class NodeCanvasFactory {
  create(width, height) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }

  reset(canvasAndContext, width, height) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

/**
 * @typedef {Object} PdfTextItem
 * @property {string} text
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} PdfPageText
 * @property {number} pageNumber
 * @property {string} text
 * @property {PdfTextItem[]} items
 */

/**
 * @typedef {Object} PdfEmbeddedTextResult
 * @property {string} text
 * @property {number} pageCount
 * @property {PdfPageText[]} pages
 */

/**
 * @typedef {Object} PdfProcessResult
 * @property {string} text
 * @property {number} pageCount
 * @property {boolean} hasEmbeddedText
 * @property {Buffer[]} [ocrImages]
 */

/**
 * pdfjs-dist rejects Node.js Buffer even though it extends Uint8Array.
 * @param {Buffer | Uint8Array | ArrayBuffer} buffer
 * @returns {Uint8Array}
 */
function toPdfBinaryData(buffer) {
  return Buffer.isBuffer(buffer) ? new Uint8Array(buffer) : new Uint8Array(buffer);
}

async function loadPdfDocument(buffer) {
  const canvasFactory = new NodeCanvasFactory();
  const data = toPdfBinaryData(buffer);

  return pdfjs.getDocument({
    data,
    standardFontDataUrl: path.join(pdfjsPath, "standard_fonts/"),
    cMapUrl: path.join(pdfjsPath, "cmaps/"),
    cMapPacked: true,
    isEvalSupported: false,
    stopAtErrors: false,
    canvasFactory,
  }).promise;
}

function sortTextItems(items) {
  return [...items].sort((a, b) => {
    const yDiff = b.y - a.y;
    if (Math.abs(yDiff) > 4) return yDiff;
    return a.x - b.x;
  });
}

function buildPageText(rawItems) {
  const items = rawItems
    .filter((item) => "str" in item && item.str?.trim())
    .map((item) => ({
      text: item.str.trim(),
      x: item.transform[4],
      y: item.transform[5],
    }));

  const sorted = sortTextItems(items);
  const lines = [];
  let currentLine = [];
  let currentY = null;

  for (const item of sorted) {
    if (currentY == null || Math.abs(item.y - currentY) <= 4) {
      currentLine.push(item.text);
      currentY = item.y;
      continue;
    }

    if (currentLine.length > 0) {
      lines.push(currentLine.join(" "));
    }
    currentLine = [item.text];
    currentY = item.y;
  }

  if (currentLine.length > 0) {
    lines.push(currentLine.join(" "));
  }

  return {
    text: lines.join("\n").trim(),
    items: sorted,
  };
}

function formatPageTexts(pages) {
  return pages
    .map((page) => {
      if (!page.text) return "";
      return `--- Page ${page.pageNumber} ---\n${page.text}`;
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

async function extractEmbeddedPages(pdfDocument, maxPages) {
  const limit = Math.min(pdfDocument.numPages, maxPages);
  const pages = [];

  for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const pageText = buildPageText(textContent.items);

    pages.push({
      pageNumber,
      text: pageText.text,
      items: pageText.items,
    });
  }

  return pages;
}

async function renderDocumentPages(pdfDocument, dpi, maxPages) {
  const limit = Math.min(pdfDocument.numPages, maxPages);
  const scale = dpi / 72;
  const canvasFactory = new NodeCanvasFactory();
  const images = [];

  for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const { canvas, context } = canvasFactory.create(viewport.width, viewport.height);

    await page.render({
      canvasContext: context,
      canvas,
      viewport,
    }).promise;

    images.push(canvas.toBuffer("image/png"));
    canvasFactory.destroy({ canvas, context });
  }

  if (images.length === 0) {
    throw new Error("PDF has no renderable pages.");
  }

  return images;
}

/**
 * Load PDF once, extract embedded text, optionally render pages for OCR.
 * @param {Buffer} pdfBuffer
 * @param {{ minChars?: number, dpi?: number, maxPages?: number }} [options]
 * @returns {Promise<PdfProcessResult>}
 */
export async function processPdfDocument(pdfBuffer, options = {}) {
  const minChars = options.minChars ?? 80;
  const dpi = options.dpi ?? 200;
  const maxPages = options.maxPages ?? 2;

  const pdfDocument = await loadPdfDocument(pdfBuffer);

  try {
    const pages = await extractEmbeddedPages(pdfDocument, maxPages);
    const text = formatPageTexts(pages);

    if (text.length >= minChars) {
      return {
        text,
        pageCount: pdfDocument.numPages,
        hasEmbeddedText: true,
      };
    }

    const ocrImages = await renderDocumentPages(pdfDocument, dpi, maxPages);

    return {
      text,
      pageCount: pdfDocument.numPages,
      hasEmbeddedText: false,
      ocrImages,
    };
  } finally {
    await pdfDocument.destroy();
  }
}

/** @deprecated Use processPdfDocument instead. */
export async function extractEmbeddedPdfTextWithPositions(pdfBuffer) {
  const result = await processPdfDocument(pdfBuffer, {
    minChars: Number.MAX_SAFE_INTEGER,
    maxPages: 50,
  });

  return {
    text: result.text,
    pageCount: result.pageCount,
    pages: [],
  };
}

/** @deprecated Use processPdfDocument instead. */
export async function renderPdfPagesAtDpi(pdfBuffer, dpi, maxPages) {
  const pdfDocument = await loadPdfDocument(pdfBuffer);

  try {
    return renderDocumentPages(pdfDocument, dpi, maxPages);
  } finally {
    await pdfDocument.destroy();
  }
}
