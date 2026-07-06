import express from "express";
import {
  createFanAuditRecord,
  getFanAuditRecords,
  getFanAuditRecordById,
  updateFanAuditRecord,
  deleteFanAuditRecord,
  uploadFanAuditRecordDocuments,
} from "./fan-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createFanAuditRecord)
  .get(protect, getFanAuditRecords);

router
  .route("/:id")
  .get(protect, getFanAuditRecordById)
  .put(protect, uploadDocuments, updateFanAuditRecord)
  .delete(protect, deleteFanAuditRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadFanAuditRecordDocuments,
);

export default router;
