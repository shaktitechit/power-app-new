import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createCompanyService,
  getCompaniesService,
  getDefaultCompanyService,
  getCompanyByIdService,
  getCompanyBrandingService,
  resolveCompanyBrandingAsset,
  updateCompanyService,
  setDefaultCompanyService,
  deleteCompanyService,
} from "./company.services.js";
import {
  getFileMeta,
  getViewPresignedUrl,
} from "../../services/fileManagement/index.js";

// POST /api/v1/companies
export const createCompany = asyncHandler(async (req, res) => {
  const data = await createCompanyService({
    user: req.user,
    body: req.body,
    files: req.files,
  });
  return res.status(201).json({
    success: true,
    message: "Company created successfully",
    data,
  });
});

// GET /api/v1/companies
export const getCompanies = asyncHandler(async (_req, res) => {
  const data = await getCompaniesService();
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/companies/branding
export const getCompanyBranding = asyncHandler(async (_req, res) => {
  const data = await getCompanyBrandingService();
  return res.status(200).json({
    success: true,
    data: data || {},
  });
});

function sanitizeFilename(name) {
  return String(name || "file")
    .replace(/[^\w.\-() ]+/g, "_")
    .trim()
    .slice(0, 180) || "file";
}

// GET /api/v1/companies/branding/logo|favicon
export const streamCompanyBrandingAsset = asyncHandler(async (req, res) => {
  const kind = req.params.kind === "favicon" ? "favicon" : "logo";
  const asset = await resolveCompanyBrandingAsset(kind);
  if (!asset) {
    const err = new Error("Branding asset not found");
    err.statusCode = 404;
    throw err;
  }

  if (asset.redirectUrl) {
    return res.redirect(302, asset.redirectUrl);
  }

  const meta = await getFileMeta(asset.fileId);
  const presignedUrl = await getViewPresignedUrl(asset.fileId);
  const upstream = await fetch(presignedUrl);
  if (!upstream.ok) {
    const error = new Error("Failed to fetch branding file");
    error.statusCode = 502;
    throw error;
  }

  const contentType =
    meta?.mimeType ||
    upstream.headers.get("content-type") ||
    "application/octet-stream";

  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "public, max-age=60");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitizeFilename(meta?.originalName || kind)}"`,
  );

  const buffer = Buffer.from(await upstream.arrayBuffer());
  return res.send(buffer);
});

// GET /api/v1/companies/default
export const getDefaultCompany = asyncHandler(async (_req, res) => {
  const data = await getDefaultCompanyService();
  return res.status(200).json({ success: true, data });
});

// GET /api/v1/companies/:id
export const getCompanyById = asyncHandler(async (req, res) => {
  const data = await getCompanyByIdService({ companyId: req.params.id });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/companies/:id
export const updateCompany = asyncHandler(async (req, res) => {
  const data = await updateCompanyService({
    user: req.user,
    companyId: req.params.id,
    body: req.body,
    files: req.files,
  });
  return res.status(200).json({
    success: true,
    message: "Company updated successfully",
    data,
  });
});

// PUT /api/v1/companies/:id/default
export const setDefaultCompany = asyncHandler(async (req, res) => {
  const data = await setDefaultCompanyService({
    user: req.user,
    companyId: req.params.id,
  });
  return res.status(200).json({
    success: true,
    message: "Default company updated successfully",
    data,
  });
});

// DELETE /api/v1/companies/:id
export const deleteCompany = asyncHandler(async (req, res) => {
  await deleteCompanyService({ companyId: req.params.id });
  return res.status(200).json({
    success: true,
    message: "Company deleted successfully",
  });
});
