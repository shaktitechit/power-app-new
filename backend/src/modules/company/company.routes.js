import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import { uploadCompanyBranding } from "../../middlewares/uploadMiddleware.js";
import {
  createCompany,
  getCompanies,
  getDefaultCompany,
  getCompanyBranding,
  streamCompanyBrandingAsset,
  getCompanyById,
  updateCompany,
  setDefaultCompany,
  deleteCompany,
} from "./company.controllers.js";

const router = express.Router();

router
  .route("/")
  .post(
    protect,
    authorize(RESOURCES.COMPANY, ACTIONS.CREATE),
    uploadCompanyBranding,
    createCompany,
  )
  .get(protect, authorize(RESOURCES.COMPANY, ACTIONS.READ), getCompanies);

router.get("/branding", getCompanyBranding);
router.get("/branding/:kind", streamCompanyBrandingAsset);

router.get(
  "/default",
  protect,
  authorize(RESOURCES.COMPANY, ACTIONS.READ),
  getDefaultCompany,
);

router.put(
  "/:id/default",
  protect,
  authorize(RESOURCES.COMPANY, ACTIONS.UPDATE),
  setDefaultCompany,
);

router
  .route("/:id")
  .get(protect, authorize(RESOURCES.COMPANY, ACTIONS.READ), getCompanyById)
  .put(
    protect,
    authorize(RESOURCES.COMPANY, ACTIONS.UPDATE),
    uploadCompanyBranding,
    updateCompany,
  )
  .delete(protect, authorize(RESOURCES.COMPANY, ACTIONS.DELETE), deleteCompany);

export default router;
