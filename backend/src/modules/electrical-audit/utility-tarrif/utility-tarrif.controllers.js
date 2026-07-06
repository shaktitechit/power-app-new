import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createUtilityTariffService,
  getUtilityTariffsService,
  getUtilityTariffByIdService,
  updateUtilityTariffService,
  deleteUtilityTariffService,
  uploadTariffDocumentsService,
  getDeletedUtilityTariffLookupService,
  restoreUtilityTariffService,
} from "./utility-tarrif.services.js";

// @desc createUtilityTariff
const createUtilityTariff = asyncHandler(async (req, res) => {
  const result = await createUtilityTariffService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getUtilityTariffs
const getUtilityTariffs = asyncHandler(async (req, res) => {
  const result = await getUtilityTariffsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getUtilityTariffById
const getUtilityTariffById = asyncHandler(async (req, res) => {
  const result = await getUtilityTariffByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateUtilityTariff
const updateUtilityTariff = asyncHandler(async (req, res) => {
  const result = await updateUtilityTariffService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteUtilityTariff
const deleteUtilityTariff = asyncHandler(async (req, res) => {
  const result = await deleteUtilityTariffService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getDeletedUtilityTariffLookup
const getDeletedUtilityTariffLookup = asyncHandler(async (req, res) => {
  const result = await getDeletedUtilityTariffLookupService({
    user: req.user,
    reqQuery: req.query,
  });
  res.json(result);
});

// @desc restoreUtilityTariff
const restoreUtilityTariff = asyncHandler(async (req, res) => {
  const result = await restoreUtilityTariffService({
    user: req.user,
    id: req.params.id,
    body: req.body,
    files: req.files,
  });
  res.json(result);
});

// @desc uploadTariffDocuments
const uploadTariffDocuments = asyncHandler(async (req, res) => {
  const result = await uploadTariffDocumentsService({
    user: req.user,
    files: req.files,
    id: req.params.id,
    body: req.body,
  });
  res.json(result);
});

export {
  createUtilityTariff,
  getUtilityTariffs,
  getUtilityTariffById,
  updateUtilityTariff,
  deleteUtilityTariff,
  uploadTariffDocuments,
  getDeletedUtilityTariffLookup,
  restoreUtilityTariff,
};
