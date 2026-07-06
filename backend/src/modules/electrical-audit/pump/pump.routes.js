import express from "express";
import {
  createPump,
  getPumps,
  getPumpById,
  updatePump,
  deletePump,
  uploadPumpDocuments
} from "./pump.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createPump)
  .get(protect, getPumps);

router
  .route("/:id")
  .get(protect, getPumpById)
  .put(protect, uploadDocuments, updatePump)
  .delete(protect, deletePump);

router.post("/:id/documents", protect, uploadDocuments, uploadPumpDocuments);

export default router;
