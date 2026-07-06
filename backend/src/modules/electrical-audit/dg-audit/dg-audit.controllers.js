import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createDGAuditRecordService,
  getDGAuditRecordsService,
  getDGAuditRecordByIdService,
  updateDGAuditRecordService,
  uploadDGAuditRecordDocumentsService,
  deleteDGAuditRecordService
} from "./dg-audit.services.js";

// @desc createDGAuditRecord
const createDGAuditRecord = asyncHandler(async (req, res) => {
  const result = await createDGAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getDGAuditRecords
const getDGAuditRecords = asyncHandler(async (req, res) => {
  const result = await getDGAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getDGAuditRecordById
const getDGAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getDGAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateDGAuditRecord
const updateDGAuditRecord = asyncHandler(async (req, res) => {
  const result = await updateDGAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadDGAuditRecordDocuments
const uploadDGAuditRecordDocuments = asyncHandler(async (req, res) => {
  const result = await uploadDGAuditRecordDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

// @desc deleteDGAuditRecord
const deleteDGAuditRecord = asyncHandler(async (req, res) => {
  const result = await deleteDGAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

export {
  createDGAuditRecord,
  getDGAuditRecords,
  getDGAuditRecordById,
  updateDGAuditRecord,
  uploadDGAuditRecordDocuments,
  deleteDGAuditRecord
};
