import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createACAuditRecordService,
  getACAuditRecordsService,
  getACAuditRecordByIdService,
  updateACAuditRecordService,
  deleteACAuditRecordService,
  uploadACAuditRecordDocumentsService,
} from "./ac-audit.services.js";

// @desc createACAuditRecord
const createACAuditRecord = asyncHandler(async (req, res) => {
  const result = await createACAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getACAuditRecords
const getACAuditRecords = asyncHandler(async (req, res) => {
  const result = await getACAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getACAuditRecordById
const getACAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getACAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateACAuditRecord
const updateACAuditRecord = asyncHandler(async (req, res) => {
  const result = await updateACAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteACAuditRecord
const deleteACAuditRecord = asyncHandler(async (req, res) => {
  const result = await deleteACAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadACAuditRecordDocuments
const uploadACAuditRecordDocuments = asyncHandler(async (req, res) => {
  const result = await uploadACAuditRecordDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createACAuditRecord,
  getACAuditRecords,
  getACAuditRecordById,
  updateACAuditRecord,
  deleteACAuditRecord,
  uploadACAuditRecordDocuments,
};
