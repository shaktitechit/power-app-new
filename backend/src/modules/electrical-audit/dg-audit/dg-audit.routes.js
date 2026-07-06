import express from "express";
import {
  createDGAuditRecord,
  getDGAuditRecords,
  getDGAuditRecordById,
  updateDGAuditRecord,
  uploadDGAuditRecordDocuments,
  deleteDGAuditRecord
} from "./dg-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createDGAuditRecord)
  .get(protect, getDGAuditRecords);

router
  .route("/:id")
  .get(protect, getDGAuditRecordById)
  .put(protect, uploadDocuments, updateDGAuditRecord)
  .delete(protect, deleteDGAuditRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadDGAuditRecordDocuments,
);

export default router;
