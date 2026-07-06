import express from "express";
import {
  createACAuditRecord,
  getACAuditRecords,
  getACAuditRecordById,
  updateACAuditRecord,
  deleteACAuditRecord,
  uploadACAuditRecordDocuments,
} from "./ac-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createACAuditRecord)
  .get(protect, getACAuditRecords);

router
  .route("/:id")
  .get(protect, getACAuditRecordById)
  .put(protect, uploadDocuments, updateACAuditRecord)
  .delete(protect, deleteACAuditRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadACAuditRecordDocuments,
);

export default router;
