import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createUtilityAccountService,
  bulkCreateUtilityAccountsService,
  getUtilityAccountsService,
  getUtilityAccountByIdService,
  submitUtilityAuditStepService,
  allowUtilityAuditStepService,
  openUtilityAuditService,
  updateUtilityAccountService,
  uploadUtilityAccountDocumentsService,
  deleteUtilityAccountService,
} from "./utility.services.js";

// @route POST /api/v1/utilities
const createUtilityAccount = asyncHandler(async (req, res) => {
  const utilityAccount = await createUtilityAccountService({
    user: req.user,
    body: req.body,
    files: req.files,
  });

  res.status(201).json({
    success: true,
    message: "Utility account created successfully",
    data: utilityAccount,
  });
});

// @route POST /api/v1/utilities/bulk
const bulkCreateUtilityAccounts = asyncHandler(async (req, res) => {
  const result = await bulkCreateUtilityAccountsService({
    user: req.user,
    body: req.body,
  });

  const { summary } = result;
  const message =
    summary.failed === 0
      ? `Created ${summary.created} utility account${summary.created === 1 ? "" : "s"}`
      : `Created ${summary.created} of ${summary.total} utility accounts`;

  if (summary.created === 0) {
    return res.status(400).json({
      success: false,
      message: "No utility accounts were created",
      data: result,
    });
  }

  res.status(201).json({
    success: true,
    message,
    data: result,
  });
});

// @route GET /api/v1/utilities
const getUtilityAccounts = asyncHandler(async (req, res) => {
  const utilities = await getUtilityAccountsService({
    user: req.user,
    query: req.query,
  });

  res.status(200).json({
    success: true,
    count: utilities.length,
    data: utilities,
  });
});

// @route GET /api/v1/utilities/:id
const getUtilityAccountById = asyncHandler(async (req, res) => {
  const payload = await getUtilityAccountByIdService({
    user: req.user,
    id: req.params.id,
  });

  res.status(200).json({
    success: true,
    data: payload,
  });
});

// @route POST /api/v1/utilities/:id/audit-step-submit
const submitUtilityAuditStep = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const updated = await submitUtilityAuditStepService({
    user: req.user,
    id: req.params.id,
    step: req.body?.step,
    io,
  });

  res.status(200).json({
    success: true,
    message: "Audit step submitted",
    data: updated,
  });
});

// @route POST /api/v1/utilities/:id/audit-step-allow
const allowUtilityAuditStep = asyncHandler(async (req, res) => {
  const updated = await allowUtilityAuditStepService({
    user: req.user,
    id: req.params.id,
    step: req.body?.step,
  });

  res.status(200).json({
    success: true,
    message: "Audit step unlocked for editing",
    data: updated,
  });
});

// @route POST /api/v1/utilities/:id/open-audit
const openUtilityAudit = asyncHandler(async (req, res) => {
  const updated = await openUtilityAuditService({
    user: req.user,
    id: req.params.id,
  });

  res.status(200).json({
    success: true,
    message: "Utility audit re-opened. All included records are pending again.",
    data: updated,
  });
});

// @route PUT /api/v1/utilities/:id
const updateUtilityAccount = asyncHandler(async (req, res) => {
  const updated = await updateUtilityAccountService({
    user: req.user,
    id: req.params.id,
    body: req.body,
    files: req.files,
  });

  res.status(200).json({
    success: true,
    message: "Utility account updated successfully",
    data: updated,
  });
});

// @route POST /api/v1/utilities/:id/documents
const uploadUtilityAccountDocuments = asyncHandler(async (req, res) => {
  const updated = await uploadUtilityAccountDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });

  res.status(200).json({
    success: true,
    message: "Documents uploaded successfully",
    data: updated,
  });
});

// @route DELETE /api/v1/utilities/:id
const deleteUtilityAccount = asyncHandler(async (req, res) => {
  await deleteUtilityAccountService({
    user: req.user,
    id: req.params.id,
  });

  res.status(200).json({
    success: true,
    message: "Utility account deleted successfully",
  });
});

export {
  createUtilityAccount,
  bulkCreateUtilityAccounts,
  getUtilityAccounts,
  getUtilityAccountById,
  submitUtilityAuditStep,
  allowUtilityAuditStep,
  openUtilityAudit,
  updateUtilityAccount,
  uploadUtilityAccountDocuments,
  deleteUtilityAccount,
};
