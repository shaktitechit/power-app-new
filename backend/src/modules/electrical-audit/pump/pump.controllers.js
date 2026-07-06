import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createPumpService,
  getPumpsService,
  getPumpByIdService,
  updatePumpService,
  deletePumpService,
  uploadPumpDocumentsService
} from "./pump.services.js";

// @desc createPump
const createPump = asyncHandler(async (req, res) => {
  const result = await createPumpService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getPumps
const getPumps = asyncHandler(async (req, res) => {
  const result = await getPumpsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getPumpById
const getPumpById = asyncHandler(async (req, res) => {
  const result = await getPumpByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updatePump
const updatePump = asyncHandler(async (req, res) => {
  const result = await updatePumpService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deletePump
const deletePump = asyncHandler(async (req, res) => {
  const result = await deletePumpService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc uploadPumpDocuments
const uploadPumpDocuments = asyncHandler(async (req, res) => {
  const result = await uploadPumpDocumentsService({
    user: req.user,
    body: req.body,
    files: req.files,
    id: req.params.id,
  });
  res.json(result);
});

export {
  createPump,
  getPumps,
  getPumpById,
  updatePump,
  deletePump,
  uploadPumpDocuments
};
