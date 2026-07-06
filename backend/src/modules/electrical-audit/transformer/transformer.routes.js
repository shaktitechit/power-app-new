import express from "express";
import {
  createTransformer,
  getTransformers,
  getTransformerById,
  updateTransformer,
  uploadTransformerDocuments,
  deleteTransformer
} from "./transformer.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createTransformer)
  .get(protect, getTransformers);

router
  .route("/:id")
  .get(protect, getTransformerById)
  .put(protect, uploadDocuments, updateTransformer)
  .delete(protect, deleteTransformer);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadTransformerDocuments,
);

export default router;
