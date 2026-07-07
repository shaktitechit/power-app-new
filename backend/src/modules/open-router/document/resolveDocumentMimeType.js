import path from "node:path";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tif", ".tiff"]);
const PDF_EXTENSIONS = new Set([".pdf"]);

/**
 * Normalize multer mimetype (some clients send application/octet-stream).
 * @param {{ mimetype?: string, originalname?: string }} file
 */
export function resolveDocumentMimeType(file) {
  const current = file.mimetype || "";
  if (current.startsWith("image/") || current === "application/pdf") {
    return current;
  }

  const ext = path.extname(file.originalname || "").toLowerCase();
  if (PDF_EXTENSIONS.has(ext)) return "application/pdf";
  if (IMAGE_EXTENSIONS.has(ext)) {
    if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
    if (ext === ".png") return "image/png";
    if (ext === ".webp") return "image/webp";
    if (ext === ".gif") return "image/gif";
    if (ext === ".bmp") return "image/bmp";
    if (ext === ".tif" || ext === ".tiff") return "image/tiff";
    return "image/jpeg";
  }

  return current;
}
