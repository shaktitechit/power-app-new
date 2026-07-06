import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createTransformerService,
  getTransformersService,
  getTransformerByIdService,
  updateTransformerService,
  deleteTransformerService,
  uploadTransformerDocumentsService
} from "./transformer.services.js";

// @desc createTransformer
const createTransformer = asyncHandler(async (req, res) => {
  const result = await createTransformerService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getTransformers
const getTransformers = asyncHandler(async (req, res) => {
  const result = await getTransformersService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getTransformerById
const getTransformerById = asyncHandler(async (req, res) => {
  const result = await getTransformerByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateTransformer
const updateTransformer = asyncHandler(async (req, res) => {
  const result = await updateTransformerService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteTransformer
const deleteTransformer = asyncHandler(async (req, res) => {
  const result = await deleteTransformerService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadTransformerDocuments
const uploadTransformerDocuments = asyncHandler(async (req, res) => {
  const result = await uploadTransformerDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createTransformer,
  getTransformers,
  getTransformerById,
  updateTransformer,
  uploadTransformerDocuments,
  deleteTransformer
};
