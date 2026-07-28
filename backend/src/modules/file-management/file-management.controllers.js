import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getDownloadPresignedUrl,
  getViewPresignedUrl,
  getFileMeta,
} from "../../services/fileManagement/index.js";

function sanitizeFilename(name) {
  return String(name || "file")
    .replace(/[^\w.\-() ]+/g, "_")
    .trim()
    .slice(0, 180) || "file";
}

// GET /api/v1/file-management/files/:fileId/content
export const streamFileContent = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const meta = await getFileMeta(fileId);
  const presignedUrl = await getViewPresignedUrl(fileId);

  const upstream = await fetch(presignedUrl);
  if (!upstream.ok) {
    const error = new Error("Failed to fetch file from storage");
    error.statusCode = 502;
    throw error;
  }

  const contentType =
    meta?.mimeType ||
    upstream.headers.get("content-type") ||
    "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, max-age=3600");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitizeFilename(meta?.originalName)}"`,
  );

  const buffer = Buffer.from(await upstream.arrayBuffer());
  return res.send(buffer);
});

// GET /api/v1/files/:fileId/view
export const redirectToViewUrl = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const url = await getViewPresignedUrl(fileId);
  return res.redirect(302, url);
});

// GET /api/v1/files/:fileId/download
export const redirectToDownloadUrl = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const url = await getDownloadPresignedUrl(fileId);
  return res.redirect(302, url);
});
