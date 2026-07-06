import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createLightingAuditRecordService,
  getLightingAuditRecordsService,
  getLightingAuditRecordByIdService,
  updateLightingAuditRecordService,
  deleteLightingAuditRecordService,
  uploadLightingAuditDocumentsService,
} from "./lighting-audit.services.js";

// @desc createLightingAuditRecord
const createLightingAuditRecord = asyncHandler(async (req, res) => {
  const result = await createLightingAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getLightingAuditRecords
const getLightingAuditRecords = asyncHandler(async (req, res) => {
  const result = await getLightingAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getLightingAuditRecordById
const getLightingAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getLightingAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateLightingAuditRecord
const updateLightingAuditRecord = asyncHandler(async (req, res) => {
  const result = await updateLightingAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteLightingAuditRecord
const deleteLightingAuditRecord = asyncHandler(async (req, res) => {
  const result = await deleteLightingAuditRecordService({
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
const uploadLightingAuditDocuments = asyncHandler(async (req, res) => {
  const result = await uploadLightingAuditDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createLightingAuditRecord,
  getLightingAuditRecords,
  getLightingAuditRecordById,
  updateLightingAuditRecord,
  deleteLightingAuditRecord,
  uploadLightingAuditDocuments,
};
