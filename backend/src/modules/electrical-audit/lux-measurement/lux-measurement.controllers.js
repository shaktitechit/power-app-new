import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createLuxMeasurementService,
  getLuxMeasurementsService,
  getLuxMeasurementByIdService,
  updateLuxMeasurementService,
  deleteLuxMeasurementService,
  uploadLuxMeasurementDocumentsService,
} from "./lux-measurement.services.js";

// @desc createLuxMeasurement
const createLuxMeasurement = asyncHandler(async (req, res) => {
  const result = await createLuxMeasurementService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getLuxMeasurements
const getLuxMeasurements = asyncHandler(async (req, res) => {
  const result = await getLuxMeasurementsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getLuxMeasurementById
const getLuxMeasurementById = asyncHandler(async (req, res) => {
  const result = await getLuxMeasurementByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateLuxMeasurement
const updateLuxMeasurement = asyncHandler(async (req, res) => {
  const result = await updateLuxMeasurementService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteLuxMeasurement
const deleteLuxMeasurement = asyncHandler(async (req, res) => {
  const result = await deleteLuxMeasurementService({
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
const uploadLuxMeasurementDocuments = asyncHandler(async (req, res) => {
  const result = await uploadLuxMeasurementDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createLuxMeasurement,
  getLuxMeasurements,
  getLuxMeasurementById,
  updateLuxMeasurement,
  deleteLuxMeasurement,
  uploadLuxMeasurementDocuments,
};
