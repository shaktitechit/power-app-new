import express from "express";
import {
  createLightingAuditRecord,
  getLightingAuditRecords,
  getLightingAuditRecordById,
  updateLightingAuditRecord,
  deleteLightingAuditRecord,
  uploadLightingAuditDocuments,
} from "./lighting-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createLightingAuditRecord)
  .get(protect, getLightingAuditRecords);

router
  .route("/:id")
  .get(protect, getLightingAuditRecordById)
  .put(protect, uploadDocuments, updateLightingAuditRecord)
  .delete(protect, deleteLightingAuditRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadLightingAuditDocuments,
);

export default router;
