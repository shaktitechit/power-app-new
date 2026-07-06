import express from "express";
import { protect } from "../auth/auth.middlewares.js";
import {
  createFacility,
  getFacilities,
  getFacilitiesUtilityProgress,
  getFacilityById,
  updateFacility,
  deleteFacility,
  closeFacilityAudit,
  openFacilityAudit,
} from "./facility.controllers.js";
import { uploadDocuments } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

router.get("/utility-progress", protect, getFacilitiesUtilityProgress);

router
  .route("/")
  .post(protect, uploadDocuments, createFacility)
  .get(protect, getFacilities);

router
  .route("/:id")
  .get(protect, getFacilityById)
  .put(protect, uploadDocuments, updateFacility)
  .delete(protect, deleteFacility);

router.post("/:id/audit-close", protect, closeFacilityAudit);
router.post("/:id/audit-open", protect, openFacilityAudit);

export default router;
