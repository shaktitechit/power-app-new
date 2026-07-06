import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createSolarGenerationRecordService,
  getSolarGenerationRecordsService,
  getSolarGenerationRecordByIdService,
  updateSolarGenerationRecordService,
  deleteSolarGenerationRecordService,
  uploadSolarGenerationRecordDocumentsService,
} from "./solar-generation-audit.services.js";

// @desc createSolarGenerationRecord
const createSolarGenerationRecord = asyncHandler(async (req, res) => {
  const result = await createSolarGenerationRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getSolarGenerationRecords
const getSolarGenerationRecords = asyncHandler(async (req, res) => {
  const result = await getSolarGenerationRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getSolarGenerationRecordById
const getSolarGenerationRecordById = asyncHandler(async (req, res) => {
  const result = await getSolarGenerationRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateSolarGenerationRecord
const updateSolarGenerationRecord = asyncHandler(async (req, res) => {
  const result = await updateSolarGenerationRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteSolarGenerationRecord
const deleteSolarGenerationRecord = asyncHandler(async (req, res) => {
  const result = await deleteSolarGenerationRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

const uploadSolarGenerationRecordDocuments = asyncHandler(async (req, res) => {
  const result = await uploadSolarGenerationRecordDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createSolarGenerationRecord,
  getSolarGenerationRecords,
  getSolarGenerationRecordById,
  updateSolarGenerationRecord,
  deleteSolarGenerationRecord,
  uploadSolarGenerationRecordDocuments,
};
