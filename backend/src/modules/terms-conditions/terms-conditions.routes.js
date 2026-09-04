import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import {
  createTermsConditions,
  getTermsConditions,
  getTermsConditionsById,
  updateTermsConditions,
  deleteTermsConditions,
} from "./terms-conditions.controllers.js";

const router = express.Router();

router
  .route("/")
  .post(
    protect,
    authorize(RESOURCES.TERMS_CONDITIONS, ACTIONS.CREATE),
    createTermsConditions,
  )
  .get(
    protect,
    authorize(RESOURCES.TERMS_CONDITIONS, ACTIONS.READ),
    getTermsConditions,
  );

router
  .route("/:id")
  .get(
    protect,
    authorize(RESOURCES.TERMS_CONDITIONS, ACTIONS.READ),
    getTermsConditionsById,
  )
  .put(
    protect,
    authorize(RESOURCES.TERMS_CONDITIONS, ACTIONS.UPDATE),
    updateTermsConditions,
  )
  .delete(
    protect,
    authorize(RESOURCES.TERMS_CONDITIONS, ACTIONS.DELETE),
    deleteTermsConditions,
  );

export default router;
