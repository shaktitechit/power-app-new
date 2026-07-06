import express from "express";
import {
  createHVACAudit,
  getHVACAudits,
  getHVACAuditById,
  updateHVACAudit,
  deleteHVACAudit,
  uploadHVACAuditDocuments,
} from "./hvac-audit.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createHVACAudit)
  .get(protect, getHVACAudits);

router
  .route("/:id")
  .get(protect, getHVACAuditById)
  .put(protect, uploadDocuments, updateHVACAudit)
  .delete(protect, deleteHVACAudit);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadHVACAuditDocuments,
);

export default router;
