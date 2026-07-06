import express from "express";
import {
  createStreetLightAuditRecord,
  getStreetLightAuditRecords,
  getStreetLightAuditRecordById,
  updateStreetLightAuditRecord,
  deleteStreetLightAuditRecord,
  uploadStreetLightAuditDocuments,
} from "./street-light-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createStreetLightAuditRecord)
  .get(protect, getStreetLightAuditRecords);

router
  .route("/:id")
  .get(protect, getStreetLightAuditRecordById)
  .put(protect, uploadDocuments, updateStreetLightAuditRecord)
  .delete(protect, deleteStreetLightAuditRecord);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadStreetLightAuditDocuments,
);

export default router;
