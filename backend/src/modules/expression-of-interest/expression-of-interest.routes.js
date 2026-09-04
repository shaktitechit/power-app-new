import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import {
  createEoi,
  getEois,
  getEoiById,
  updateEoi,
  updateEoiStatus,
  acceptEoi,
  sendEoiEmail,
  deleteEoi,
  getEoiSignatories,
} from "./expression-of-interest.controllers.js";
import { uploadEmailAttachment } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();

router
  .route("/")
  .post(protect, authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.CREATE), createEoi)
  .get(protect, authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.READ), getEois);

router.get(
  "/signatories",
  protect,
  authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.READ),
  getEoiSignatories,
);

router.put(
  "/:id/status",
  protect,
  authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.UPDATE),
  updateEoiStatus,
);

router.put(
  "/:id/accept",
  protect,
  authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.UPDATE),
  acceptEoi,
);

router.post(
  "/:id/send-email",
  protect,
  authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.UPDATE),
  uploadEmailAttachment,
  sendEoiEmail,
);

router
  .route("/:id")
  .get(protect, authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.READ), getEoiById)
  .put(protect, authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.UPDATE), updateEoi)
  .delete(protect, authorize(RESOURCES.EXPRESSION_OF_INTEREST, ACTIONS.DELETE), deleteEoi);

export default router;
