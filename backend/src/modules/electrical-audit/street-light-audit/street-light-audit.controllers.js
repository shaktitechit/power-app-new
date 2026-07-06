import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createStreetLightAuditRecordService,
  getStreetLightAuditRecordsService,
  getStreetLightAuditRecordByIdService,
  updateStreetLightAuditRecordService,
  deleteStreetLightAuditRecordService,
  uploadStreetLightAuditDocumentsService,
} from "./street-light-audit.services.js";

// @desc createStreetLightAuditRecord
const createStreetLightAuditRecord = asyncHandler(async (req, res) => {
  const result = await createStreetLightAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getStreetLightAuditRecords
const getStreetLightAuditRecords = asyncHandler(async (req, res) => {
  const result = await getStreetLightAuditRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getStreetLightAuditRecordById
const getStreetLightAuditRecordById = asyncHandler(async (req, res) => {
  const result = await getStreetLightAuditRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateStreetLightAuditRecord
const updateStreetLightAuditRecord = asyncHandler(async (req, res) => {
  const result = await updateStreetLightAuditRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteStreetLightAuditRecord
const deleteStreetLightAuditRecord = asyncHandler(async (req, res) => {
  const result = await deleteStreetLightAuditRecordService({
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
const uploadStreetLightAuditDocuments = asyncHandler(async (req, res) => {
  const result = await uploadStreetLightAuditDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createStreetLightAuditRecord,
  getStreetLightAuditRecords,
  getStreetLightAuditRecordById,
  updateStreetLightAuditRecord,
  deleteStreetLightAuditRecord,
  uploadStreetLightAuditDocuments,
};
