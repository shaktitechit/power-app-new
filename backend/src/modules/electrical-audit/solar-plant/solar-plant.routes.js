import express from "express";
import {
  createSolarPlant,
  getSolarPlants,
  getSolarPlantById,
  updateSolarPlant,
  deleteSolarPlant,
  uploadSolarPlantDocuments,
} from "./solar-plant.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createSolarPlant)
  .get(protect, getSolarPlants);

router
  .route("/:id")
  .get(protect, getSolarPlantById)
  .put(protect, uploadDocuments, updateSolarPlant)
  .delete(protect, deleteSolarPlant);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadSolarPlantDocuments,
);

export default router;
