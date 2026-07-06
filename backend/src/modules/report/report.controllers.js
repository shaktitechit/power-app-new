import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  generateReportService,
  regenerateReportService,
  createReportService,
  getReportsService,
  getReportByIdService,
  updateReportService,
  deleteReportService,
  downloadExcelReportService,
} from "./report.services.js";

// POST /api/v1/reports/generate
export const generateReport = asyncHandler(async (req, res) => {
  const data = await generateReportService({ user: req.user, body: req.body });
  return res.status(202).json({
    success: true,
    message: "Report generation queued successfully",
    data,
  });
});

// POST /api/v1/reports/:id/regenerate
export const regenerateReport = asyncHandler(async (req, res) => {
  const data = await regenerateReportService({ user: req.user, reportId: req.params.id });
  return res.status(202).json({
    success: true,
    message: "Report regeneration queued successfully",
    data,
  });
});

// POST /api/v1/reports
export const createReport = asyncHandler(async (req, res) => {
  const data = await createReportService({ user: req.user, body: req.body });
  return res.status(201).json({
    success: true,
    message: "Report created successfully",
    data,
  });
});

// GET /api/v1/reports
export const getReports = asyncHandler(async (req, res) => {
  const reports = await getReportsService({ user: req.user, query: req.query });
  return res.status(200).json({
    success: true,
    count: reports.length,
    data: reports,
  });
});

// GET /api/v1/reports/:id
export const getReportById = asyncHandler(async (req, res) => {
  const data = await getReportByIdService({ user: req.user, reportId: req.params.id });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/reports/:id
export const updateReport = asyncHandler(async (req, res) => {
  const data = await updateReportService({ user: req.user, reportId: req.params.id, body: req.body });
  return res.status(200).json({
    success: true,
    message: "Report updated successfully",
    data,
  });
});

// DELETE /api/v1/reports/:id
export const deleteReport = asyncHandler(async (req, res) => {
  await deleteReportService({ user: req.user, reportId: req.params.id });
  return res.status(200).json({
    success: true,
    message: "Report deleted successfully",
  });
});

// GET /api/v1/reports/:id/excel/download
export const downloadExcelReport = asyncHandler(async (req, res) => {
  const { buffer, filename } = await downloadExcelReportService({
    user: req.user,
    reportId: req.params.id,
  });

  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename=${filename}.xlsx`);
  res.setHeader("Content-Length", buffer.length);
  return res.end(buffer);
});
