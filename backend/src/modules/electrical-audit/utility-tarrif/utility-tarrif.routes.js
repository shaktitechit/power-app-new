import express from "express";
import { protect } from "../../auth/auth.middlewares.js";
import {
  createUtilityTariff,
  getUtilityTariffs,
  getUtilityTariffById,
  updateUtilityTariff,
  deleteUtilityTariff,
  uploadTariffDocuments,
  getDeletedUtilityTariffLookup,
  restoreUtilityTariff,
} from "./utility-tarrif.controllers.js";
import { uploadDocuments } from "../../../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/deleted-lookup", protect, getDeletedUtilityTariffLookup);

router
  .route("/")
  .post(protect, uploadDocuments, createUtilityTariff)
  .get(protect, getUtilityTariffs);

router.post("/:id/restore", protect, uploadDocuments, restoreUtilityTariff);

router
  .route("/:id")
  .get(protect, getUtilityTariffById)
  .put(protect, uploadDocuments, updateUtilityTariff)
  .delete(protect, deleteUtilityTariff);

router.post("/:id/documents", protect, uploadDocuments, uploadTariffDocuments);

export default router;
