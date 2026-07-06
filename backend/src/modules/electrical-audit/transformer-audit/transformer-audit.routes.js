import express from "express";
import {
  createTransformerAuditRecord,
  getTransformerAuditRecords,
  getTransformerAuditRecordById,
  updateTransformerAuditRecord,
  uploadTransformerAuditRecordDocuments,
  deleteTransformerAuditRecord
} from "./transformer-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createTransformerAuditRecord)
  .get(protect, getTransformerAuditRecords);

router
  .route("/:id")
  .get(protect, getTransformerAuditRecordById)
  .put(protect, uploadDocuments, updateTransformerAuditRecord)
  .delete(protect, deleteTransformerAuditRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadTransformerAuditRecordDocuments,
);

export default router;
