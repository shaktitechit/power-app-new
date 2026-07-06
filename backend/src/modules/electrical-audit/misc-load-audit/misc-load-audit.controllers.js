import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createMiscLoadAuditRecordService,
  getMiscLoadAuditRecordsService,
  getMiscLoadAuditRecordByIdService,
  updateMiscLoadAuditRecordService,
  deleteMiscLoadAuditRecordService,
  uploadMiscLoadAuditDocumentsService,
} from "./misc-load-audit.services.js";

// @desc createMiscLoadAuditRecord
const createMiscLoadAuditRecord = asyncHandler(async (req, res) => {
  const result = await createMiscLoadAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getMiscLoadAuditRecords
const getMiscLoadAuditRecords = asyncHandler(async (req, res) => {
  const result = await getMiscLoadAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getMiscLoadAuditRecordById
const getMiscLoadAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getMiscLoadAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateMiscLoadAuditRecord
const updateMiscLoadAuditRecord = asyncHandler(async (req, res) => {
  const result = await updateMiscLoadAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteMiscLoadAuditRecord
const deleteMiscLoadAuditRecord = asyncHandler(async (req, res) => {
  const result = await deleteMiscLoadAuditRecordService({
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
const uploadMiscLoadAuditDocuments = asyncHandler(async (req, res) => {
  const result = await uploadMiscLoadAuditDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createMiscLoadAuditRecord,
  getMiscLoadAuditRecords,
  getMiscLoadAuditRecordById,
  updateMiscLoadAuditRecord,
  deleteMiscLoadAuditRecord,
  uploadMiscLoadAuditDocuments,
};
