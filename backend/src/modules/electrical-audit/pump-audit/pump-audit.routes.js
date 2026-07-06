import express from "express";
import {
  createPumpAuditRecord,
  getPumpAuditRecords,
  getPumpAuditRecordById,
  updatePumpAuditRecord,
  deletePumpAuditRecord,
  uploadPumpAuditRecordDocuments
} from "./pump-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createPumpAuditRecord)
  .get(protect, getPumpAuditRecords);

router
  .route("/:id")
  .get(protect, getPumpAuditRecordById)
  .put(protect, uploadDocuments, updatePumpAuditRecord)
  .delete(protect, deletePumpAuditRecord);

router.post("/:id/documents", protect, uploadDocuments, uploadPumpAuditRecordDocuments);

export default router;
