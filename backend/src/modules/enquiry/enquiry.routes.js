import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  createEnquiry,
  getEnquiries,
  getEnquiryById,
  updateEnquiry,
  deleteEnquiry,
  getFollowUps,
  createFollowUp,
  getFollowUpById,
  updateFollowUp,
  deleteFollowUp,
  getEnquiryDocuments,
  createEnquiryDocument,
  getEnquiryDocumentById,
  updateEnquiryDocument,
  deleteEnquiryDocument,
} from "./enquiry.controllers.js";
import { createFacilityFromEnquiry } from "../facility/facility.controllers.js";
import { uploadDocuments } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

router.route("/").post(protect, createEnquiry).get(protect, getEnquiries);


router.post("/:enquiryId/facility", protect, uploadDocuments, createFacilityFromEnquiry);

router
  .route("/:enquiryId/follow-ups")
  .get(protect, getFollowUps)
  .post(protect, createFollowUp);

router
  .route("/:enquiryId/follow-ups/:followUpId")
  .get(protect, getFollowUpById)
  .put(protect, updateFollowUp)
  .delete(protect, deleteFollowUp);

router
  .route("/:enquiryId/enquiry-documents")
  .get(protect, getEnquiryDocuments)
  .post(protect, uploadDocuments, createEnquiryDocument);

router
  .route("/:enquiryId/enquiry-documents/:enquiryDocumentId")
  .get(protect, getEnquiryDocumentById)
  .put(protect, uploadDocuments, updateEnquiryDocument)
  .delete(protect, deleteEnquiryDocument);

router
  .route("/:id")
  .get(protect, getEnquiryById)
  .put(protect, updateEnquiry)
  .delete(protect, deleteEnquiry);

export default router;
