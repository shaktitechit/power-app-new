import express from "express";
import {
  createLuxMeasurement,
  getLuxMeasurements,
  getLuxMeasurementById,
  updateLuxMeasurement,
  deleteLuxMeasurement,
  uploadLuxMeasurementDocuments,
} from "./lux-measurement.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createLuxMeasurement)
  .get(protect, getLuxMeasurements);

router
  .route("/:id")
  .get(protect, getLuxMeasurementById)
  .put(protect, uploadDocuments, updateLuxMeasurement)
  .delete(protect, deleteLuxMeasurement);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadLuxMeasurementDocuments,
);

export default router;
