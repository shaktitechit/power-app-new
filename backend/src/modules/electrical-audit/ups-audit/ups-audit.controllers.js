import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createUPSAuditRecordService,
  getUPSAuditRecordsService,
  getUPSAuditRecordByIdService,
  updateUPSAuditRecordService,
  deleteUPSAuditRecordService,
  uploadUPSAuditDocumentsService,
} from "./ups-audit.services.js";

// @desc createUPSAuditRecord
const createUPSAuditRecord = asyncHandler(async (req, res) => {
  const result = await createUPSAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getUPSAuditRecords
const getUPSAuditRecords = asyncHandler(async (req, res) => {
  const result = await getUPSAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getUPSAuditRecordById
const getUPSAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getUPSAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateUPSAuditRecord
const updateUPSAuditRecord = asyncHandler(async (req, res) => {
  const result = await updateUPSAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteUPSAuditRecord
const deleteUPSAuditRecord = asyncHandler(async (req, res) => {
  const result = await deleteUPSAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// upload
const uploadUPSAuditDocuments = asyncHandler(async (req, res) => {
  const result = await uploadUPSAuditDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createUPSAuditRecord,
  getUPSAuditRecords,
  getUPSAuditRecordById,
  updateUPSAuditRecord,
  deleteUPSAuditRecord,
  uploadUPSAuditDocuments,
};
