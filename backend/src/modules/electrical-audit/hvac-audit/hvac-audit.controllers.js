import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createHVACAuditService,
  getHVACAuditsService,
  getHVACAuditByIdService,
  updateHVACAuditService,
  deleteHVACAuditService,
  uploadHVACAuditDocumentsService,
} from "./hvac-audit.services.js";

// @desc createHVACAudit
const createHVACAudit = asyncHandler(async (req, res) => {
  const result = await createHVACAuditService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getHVACAudits
const getHVACAudits = asyncHandler(async (req, res) => {
  const result = await getHVACAuditsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getHVACAuditById
const getHVACAuditById = asyncHandler(async (req, res) => {
  const result = await getHVACAuditByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateHVACAudit
const updateHVACAudit = asyncHandler(async (req, res) => {
  const result = await updateHVACAuditService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteHVACAudit
const deleteHVACAudit = asyncHandler(async (req, res) => {
  const result = await deleteHVACAuditService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadHVACAuditDocuments
const uploadHVACAuditDocuments = asyncHandler(async (req, res) => {
  const result = await uploadHVACAuditDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createHVACAudit,
  getHVACAudits,
  getHVACAuditById,
  updateHVACAudit,
  deleteHVACAudit,
  uploadHVACAuditDocuments,
};
