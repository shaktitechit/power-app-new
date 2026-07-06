import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createFanAuditRecordService,
  getFanAuditRecordsService,
  getFanAuditRecordByIdService,
  updateFanAuditRecordService,
  deleteFanAuditRecordService,
  uploadFanAuditRecordDocumentsService,
} from "./fan-audit.services.js";

// @desc createFanAuditRecord
const createFanAuditRecord = asyncHandler(async (req, res) => {
  const result = await createFanAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getFanAuditRecords
const getFanAuditRecords = asyncHandler(async (req, res) => {
  const result = await getFanAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getFanAuditRecordById
const getFanAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getFanAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateFanAuditRecord
const updateFanAuditRecord = asyncHandler(async (req, res) => {
  const result = await updateFanAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteFanAuditRecord
const deleteFanAuditRecord = asyncHandler(async (req, res) => {
  const result = await deleteFanAuditRecordService({
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
const uploadFanAuditRecordDocuments = asyncHandler(async (req, res) => {
  const result = await uploadFanAuditRecordDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createFanAuditRecord,
  getFanAuditRecords,
  getFanAuditRecordById,
  updateFanAuditRecord,
  deleteFanAuditRecord,
  uploadFanAuditRecordDocuments,
};
