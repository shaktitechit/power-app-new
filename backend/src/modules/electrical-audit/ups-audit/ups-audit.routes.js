import express from "express";
import {
  createUPSAuditRecord,
  getUPSAuditRecords,
  getUPSAuditRecordById,
  updateUPSAuditRecord,
  deleteUPSAuditRecord,
  uploadUPSAuditDocuments,
} from "./ups-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createUPSAuditRecord)
  .get(protect, getUPSAuditRecords);

router
  .route("/:id")
  .get(protect, getUPSAuditRecordById)
  .put(protect, uploadDocuments, updateUPSAuditRecord)
  .delete(protect, deleteUPSAuditRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadUPSAuditDocuments,
);

export default router;
