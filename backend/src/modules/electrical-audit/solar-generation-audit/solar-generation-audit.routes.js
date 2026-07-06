import express from "express";
import {
  createSolarGenerationRecord,
  getSolarGenerationRecords,
  getSolarGenerationRecordById,
  updateSolarGenerationRecord,
  deleteSolarGenerationRecord,
  uploadSolarGenerationRecordDocuments,
} from "./solar-generation-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createSolarGenerationRecord)
  .get(protect, getSolarGenerationRecords);

router
  .route("/:id")
  .get(protect, getSolarGenerationRecordById)
  .put(protect, uploadDocuments, updateSolarGenerationRecord)
  .delete(protect, deleteSolarGenerationRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadSolarGenerationRecordDocuments,
);

export default router;
