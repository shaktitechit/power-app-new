import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createTransformerAuditRecordService,
  getTransformerAuditRecordsService,
  getTransformerAuditRecordByIdService,
  updateTransformerAuditRecordService,
  deleteTransformerAuditRecordService,
  uploadTransformerAuditRecordDocumentsService
} from "./transformer-audit.services.js";

// @desc createTransformerAuditRecord
const createTransformerAuditRecord = asyncHandler(async (req, res) => {
  const result = await createTransformerAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getTransformerAuditRecords
const getTransformerAuditRecords = asyncHandler(async (req, res) => {
  const result = await getTransformerAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getTransformerAuditRecordById
const getTransformerAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getTransformerAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateTransformerAuditRecord
const updateTransformerAuditRecord = asyncHandler(async (req, res) => {
  const result = await updateTransformerAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteTransformerAuditRecord
const deleteTransformerAuditRecord = asyncHandler(async (req, res) => {
  const result = await deleteTransformerAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadTransformerAuditRecordDocuments
const uploadTransformerAuditRecordDocuments = asyncHandler(async (req, res) => {
  const result = await uploadTransformerAuditRecordDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createTransformerAuditRecord,
  getTransformerAuditRecords,
  getTransformerAuditRecordById,
  updateTransformerAuditRecord,
  uploadTransformerAuditRecordDocuments,
  deleteTransformerAuditRecord
};
