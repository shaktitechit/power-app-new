import express from "express";
import { protect } from "../../auth/auth.middlewares.js";
import {
  createUtilityBillingRecord,
  getUtilityBillingRecords,
  getUtilityBillingRecordById,
  updateUtilityBillingRecord,
  deleteUtilityBillingRecord,
  uploadBillingRecordDocuments
} from "./utility-billing-audit.controllers.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createUtilityBillingRecord)
  .get(protect, getUtilityBillingRecords);

router.post("/:id/documents", protect, uploadDocuments, uploadBillingRecordDocuments);

router
  .route("/:id")
  .get(protect, getUtilityBillingRecordById)
  .put(protect, uploadDocuments, updateUtilityBillingRecord)
  .delete(protect, deleteUtilityBillingRecord);

export default router;
