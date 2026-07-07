import path from "node:path";
import { createWorker } from "tesseract.js";
import { createCanvas, loadImage } from "canvas";
import {
  DOCUMENT_OCR_LANGUAGE,
  DOCUMENT_OCR_MAX_IMAGE_WIDTH,
  resolveTesseractLangPath,
} from "../../../../config/documentExtraction.js";

function resolveLangPath() {
  return resolveTesseractLangPath();
}

/**
 * Downscale large page images before OCR to reduce memory use and improve speed.
 * @param {Buffer} imageBuffer
 * @param {number} maxWidth
 */
export async function prepareImageForOcr(
  imageBuffer,
  maxWidth = DOCUMENT_OCR_MAX_IMAGE_WIDTH,
) {
  const image = await loadImage(imageBuffer);
  if (image.width <= maxWidth) {
    return imageBuffer;
  }

  const scale = maxWidth / image.width;
  const canvas = createCanvas(
    Math.max(1, Math.round(image.width * scale)),
    Math.max(1, Math.round(image.height * scale)),
  );
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toBuffer("image/png");
}

async function createOcrWorker(language = DOCUMENT_OCR_LANGUAGE) {
  return createWorker(language, 1, {
    langPath: resolveLangPath(),
    cachePath: path.join(resolveLangPath(), ".cache"),
    gzip: true,
  });
}

/**
 * OCR an image buffer with Tesseract (bundled tessdata, no CDN).
 * @param {Buffer} imageBuffer
 * @param {import("tesseract.js").Worker} [worker]
 * @param {string} [language]
 */
export async function tesseractOcrImage(
  imageBuffer,
  worker = null,
  language = DOCUMENT_OCR_LANGUAGE,
) {
  const ownsWorker = !worker;
  const activeWorker = worker ?? (await createOcrWorker(language));

  try {
    const prepared = await prepareImageForOcr(imageBuffer);
    const {
      data: { text, confidence },
    } = await activeWorker.recognize(prepared);

    return {
      text: text?.trim() ?? "",
      confidence: confidence ?? 0,
    };
  } finally {
    if (ownsWorker) {
      await activeWorker.terminate();
    }
  }
}

/**
 * OCR multiple page images with one worker instance.
 * @param {Buffer[]} pageBuffers
 * @param {string} [language]
 */
export async function tesseractOcrPages(pageBuffers, language = DOCUMENT_OCR_LANGUAGE) {
  const worker = await createOcrWorker(language);
  const sections = [];
  let totalConfidence = 0;

  try {
    for (let index = 0; index < pageBuffers.length; index += 1) {
      const { text, confidence } = await tesseractOcrImage(
        pageBuffers[index],
        worker,
        language,
      );
      totalConfidence += confidence;

      if (text) {
        sections.push(`--- Page ${index + 1} (OCR) ---\n${text}`);
      }
    }
  } finally {
    await worker.terminate();
  }

  return {
    text: sections.join("\n\n").trim(),
    confidence: pageBuffers.length
      ? totalConfidence / pageBuffers.length
      : 0,
    pageCount: pageBuffers.length,
  };
}
