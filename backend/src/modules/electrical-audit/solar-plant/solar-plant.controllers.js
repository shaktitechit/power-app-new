import asyncHandler from "../../../middlewares/asyncHandler.js";
import {
  createSolarPlantService,
  getSolarPlantsService,
  getSolarPlantByIdService,
  updateSolarPlantService,
  deleteSolarPlantService,
  uploadSolarPlantDocumentsService,
} from "./solar-plant.services.js";

// @desc createSolarPlant
const createSolarPlant = asyncHandler(async (req, res) => {
  const result = await createSolarPlantService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getSolarPlants
const getSolarPlants = asyncHandler(async (req, res) => {
  const result = await getSolarPlantsService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc getSolarPlantById
const getSolarPlantById = asyncHandler(async (req, res) => {
  const result = await getSolarPlantByIdService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc updateSolarPlant
const updateSolarPlant = asyncHandler(async (req, res) => {
  const result = await updateSolarPlantService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

// @desc deleteSolarPlant
const deleteSolarPlant = asyncHandler(async (req, res) => {
  const result = await deleteSolarPlantService({
    user: req.user,
    body: req.body,
    files: req.files,
    reqQuery: req.query,
    id: req.params.id,
    params: req.params,
  });
  res.json(result);
});

const uploadSolarPlantDocuments = asyncHandler(async (req, res) => {
  const result = await uploadSolarPlantDocumentsService({
    user: req.user,
    id: req.params.id,
    files: req.files,
    body: req.body,
  });
  res.json(result);
});

export {
  createSolarPlant,
  getSolarPlants,
  getSolarPlantById,
  updateSolarPlant,
  deleteSolarPlant,
  uploadSolarPlantDocuments,
};
