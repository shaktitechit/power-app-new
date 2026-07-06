import express from "express";
import {
  createDGSet,
  getDGSets,
  getDGSetById,
  updateDGSet,
  uploadDGSetDocuments,
  deleteDGSet
} from "./dg-set.controllers.js";
import { protect } from "../../auth/auth.middlewares.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, uploadDocuments, createDGSet)
  .get(protect, getDGSets);

router
  .route("/:id")
  .get(protect, getDGSetById)
  .put(protect, uploadDocuments, updateDGSet)
  .delete(protect, deleteDGSet);

router.post(
  "/:id/documents",
  protect,
  uploadDocuments,
  uploadDGSetDocuments,
);

export default router;
