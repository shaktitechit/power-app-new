import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createPumpAuditRecordService,
  getPumpAuditRecordsService,
  getPumpAuditRecordByIdService,
  updatePumpAuditRecordService,
  deletePumpAuditRecordService,
  uploadPumpAuditRecordDocumentsService
} from "./pump-audit.services.js";

// @desc createPumpAuditRecord
const createPumpAuditRecord = asyncHandler(async (req, res) => {
  const result = await createPumpAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getPumpAuditRecords
const getPumpAuditRecords = asyncHandler(async (req, res) => {
  const result = await getPumpAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getPumpAuditRecordById
const getPumpAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getPumpAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updatePumpAuditRecord
const updatePumpAuditRecord = asyncHandler(async (req, res) => {
  const result = await updatePumpAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deletePumpAuditRecord
const deletePumpAuditRecord = asyncHandler(async (req, res) => {
  const result = await deletePumpAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadPumpAuditRecordDocuments
const uploadPumpAuditRecordDocuments = asyncHandler(async (req, res) => {
  const result = await uploadPumpAuditRecordDocumentsService({
    user: req.user,
    body: req.body,
    files: req.files,
    id: req.params.id,
  });
  res.json(result);
});

export {
  createPumpAuditRecord,
  getPumpAuditRecords,
  getPumpAuditRecordById,
  updatePumpAuditRecord,
  deletePumpAuditRecord,
  uploadPumpAuditRecordDocuments
};
