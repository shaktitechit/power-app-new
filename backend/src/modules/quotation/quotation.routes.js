import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  updateQuotationStatus,
  acceptQuotation,
  sendQuotationEmail,
  deleteQuotation,
  getQuotationSignatories,
  approveQuotationSignatory,
} from "./quotation.controllers.js";
import { uploadEmailAttachment } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, authorize(RESOURCES.QUOTATION, ACTIONS.CREATE), createQuotation)
  .get(protect, authorize(RESOURCES.QUOTATION, ACTIONS.READ), getQuotations);

router.get(
  "/signatories",
  protect,
  authorize(RESOURCES.QUOTATION, ACTIONS.READ),
  getQuotationSignatories,
);

router.put(
  "/:id/status",
  protect,
  authorize(RESOURCES.QUOTATION, ACTIONS.UPDATE),
  updateQuotationStatus,
);

router.put(
  "/:id/accept",
  protect,
  authorize(RESOURCES.QUOTATION, ACTIONS.UPDATE),
  acceptQuotation,
);

router.put(
  "/:id/signatory-approval",
  protect,
  authorize(RESOURCES.QUOTATION, ACTIONS.UPDATE),
  approveQuotationSignatory,
);

router.post(
  "/:id/send-email",
  protect,
  authorize(RESOURCES.QUOTATION, ACTIONS.UPDATE),
  uploadEmailAttachment,
  sendQuotationEmail,
);

router
  .route("/:id")
  .get(protect, authorize(RESOURCES.QUOTATION, ACTIONS.READ), getQuotationById)
  .put(protect, authorize(RESOURCES.QUOTATION, ACTIONS.UPDATE), updateQuotation)
  .delete(protect, authorize(RESOURCES.QUOTATION, ACTIONS.DELETE), deleteQuotation);

export default router;
