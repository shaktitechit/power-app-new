import express from "express";
import {
  createMiscLoadAuditRecord,
  getMiscLoadAuditRecords,
  getMiscLoadAuditRecordById,
  updateMiscLoadAuditRecord,
  deleteMiscLoadAuditRecord,
  uploadMiscLoadAuditDocuments,
} from "./misc-load-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createMiscLoadAuditRecord)
  .get(protect, getMiscLoadAuditRecords);

router
  .route("/:id")
  .get(protect, getMiscLoadAuditRecordById)
  .put(protect, uploadDocuments, updateMiscLoadAuditRecord)
  .delete(protect, deleteMiscLoadAuditRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadMiscLoadAuditDocuments,
);

export default router;
