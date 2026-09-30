import express from "express";
import { apiKeyAuth, requireApiKeyScope } from "../../middlewares/apiKeyAuth.js";
import {
  getExternalEnquiries,
  getExternalEnquiryById,
  getExternalFacilities,
  getExternalFacilityById,
} from "./external.controllers.js";

const router = express.Router();

// All routes in external module require valid API key
router.use(apiKeyAuth);

// Enquiry endpoints
router.get(
  "/enquiries",
  requireApiKeyScope("enquiries:read"),
  getExternalEnquiries,
);

router.get(
  "/enquiries/:id",
  requireApiKeyScope("enquiries:read"),
  getExternalEnquiryById,
);

// Facility endpoints
router.get(
  "/facilities",
  requireApiKeyScope("facilities:read"),
  getExternalFacilities,
);

router.get(
  "/facilities/:id",
  requireApiKeyScope("facilities:read"),
  getExternalFacilityById,
);

export default router;
