import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createDGSetService,
  getDGSetsService,
  getDGSetByIdService,
  updateDGSetService,
  uploadDGSetDocumentsService,
  deleteDGSetService
} from "./dg-set.services.js";

// @desc createDGSet
const createDGSet = asyncHandler(async (req, res) => {
  const result = await createDGSetService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getDGSets
const getDGSets = asyncHandler(async (req, res) => {
  const result = await getDGSetsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getDGSetById
const getDGSetById = asyncHandler(async (req, res) => {
  const result = await getDGSetByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateDGSet
const updateDGSet = asyncHandler(async (req, res) => {
  const result = await updateDGSetService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadDGSetDocuments
const uploadDGSetDocuments = asyncHandler(async (req, res) => {
  const result = await uploadDGSetDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

// @desc deleteDGSet
const deleteDGSet = asyncHandler(async (req, res) => {
  const result = await deleteDGSetService({
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
  createDGSet,
  getDGSets,
  getDGSetById,
  updateDGSet,
  uploadDGSetDocuments,
  deleteDGSet
};
