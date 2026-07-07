import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const require = createRequire(import.meta.url);
const backendRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/** Tesseract language(s), e.g. eng or eng+hin. */
export const DOCUMENT_OCR_LANGUAGE = process.env.DOCUMENT_OCR_LANGUAGE || "eng+hin";

/** PDF render DPI when falling back to Tesseract OCR. */
export const DOCUMENT_PDF_RENDER_DPI = Number(process.env.DOCUMENT_PDF_RENDER_DPI || 300);

/** Max PDF pages processed for OCR fallback. */
export const DOCUMENT_OCR_MAX_PDF_PAGES = Number(
  process.env.DOCUMENT_OCR_MAX_PDF_PAGES || 10,
);

/** Max image width sent to Tesseract (300 DPI pages can be very large). */
export const DOCUMENT_OCR_MAX_IMAGE_WIDTH = Number(
  process.env.DOCUMENT_OCR_MAX_IMAGE_WIDTH || 2400,
);

/** PDF default point size is 72 DPI. */
export const PDF_BASE_DPI = 72;

const TESSDATA_DIR = path.join(backendRoot, "tessdata");

function copyIfMissing(source, destination) {
  if (!fs.existsSync(source)) return false;
  if (fs.existsSync(destination)) return true;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  return true;
}

/**
 * Ensure eng/hin traineddata files exist under backend/tessdata (no CDN download).
 * @returns {string}
 */
export function resolveTesseractLangPath() {
  const languages = DOCUMENT_OCR_LANGUAGE.split("+").filter(Boolean);
  const packages = {
    eng: "@tesseract.js-data/eng",
    hin: "@tesseract.js-data/hin",
  };

  fs.mkdirSync(TESSDATA_DIR, { recursive: true });

  for (const lang of languages) {
    const pkgName = packages[lang];
    if (!pkgName) continue;

    const pkgRoot = path.dirname(require.resolve(`${pkgName}/package.json`));
    const source = path.join(pkgRoot, "4.0.0", `${lang}.traineddata.gz`);
    const destination = path.join(TESSDATA_DIR, `${lang}.traineddata.gz`);
    copyIfMissing(source, destination);
  }

  return TESSDATA_DIR;
}

export function getPdfRenderScale(dpi = DOCUMENT_PDF_RENDER_DPI) {
  return dpi / PDF_BASE_DPI;
}
