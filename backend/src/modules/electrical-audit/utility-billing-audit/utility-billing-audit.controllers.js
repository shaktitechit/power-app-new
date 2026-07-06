import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createUtilityBillingRecordService,
  getUtilityBillingRecordsService,
  getUtilityBillingRecordByIdService,
  updateUtilityBillingRecordService,
  deleteUtilityBillingRecordService,
  uploadBillingRecordDocumentsService
} from "./utility-billing-audit.services.js";

// @desc createUtilityBillingRecord
const createUtilityBillingRecord = asyncHandler(async (req, res) => {
  const result = await createUtilityBillingRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getUtilityBillingRecords
const getUtilityBillingRecords = asyncHandler(async (req, res) => {
  const result = await getUtilityBillingRecordsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getUtilityBillingRecordById
const getUtilityBillingRecordById = asyncHandler(async (req, res) => {
  const result = await getUtilityBillingRecordByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateUtilityBillingRecord
const updateUtilityBillingRecord = asyncHandler(async (req, res) => {
  const result = await updateUtilityBillingRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteUtilityBillingRecord
const deleteUtilityBillingRecord = asyncHandler(async (req, res) => {
  const result = await deleteUtilityBillingRecordService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadBillingRecordDocuments
const uploadBillingRecordDocuments = asyncHandler(async (req, res) => {
  const result = await uploadBillingRecordDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createUtilityBillingRecord,
  getUtilityBillingRecords,
  getUtilityBillingRecordById,
  updateUtilityBillingRecord,
  deleteUtilityBillingRecord,
  uploadBillingRecordDocuments
};
