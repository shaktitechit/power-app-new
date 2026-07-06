import express from "express";
import { protect } from "../auth/auth.middlewares.js";
import { authorize } from "../../middlewares/authorizeMiddleware.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import { modelsRegistry } from "../../data/modelRegistry.js";
const { UtilityAccount } = modelsRegistry;
import {
  createUtilityAccount,
  bulkCreateUtilityAccounts,
  getUtilityAccounts,
  getUtilityAccountById,
  submitUtilityAuditStep,
  allowUtilityAuditStep,
  openUtilityAudit,
  updateUtilityAccount,
  uploadUtilityAccountDocuments,
  deleteUtilityAccount,
} from "./utility.controllers.js";
import { uploadDocuments } from "../../middlewares/uploadMiddleware.js";

const router = express.Router();
const resolveUtilityFacilityContext = async (req) => {
  const utility = await UtilityAccount.findById(req.params.id).select("facility_id");
  return { facilityId: utility?.facility_id?.toString?.() || null };
};

router
  .route("/")
  .post(
    protect,
    uploadDocuments,
    authorize(RESOURCES.UTILITY_ACCOUNT, ACTIONS.CREATE, {
      resolveContext: (req) => ({ facilityId: req.body?.facility_id }),
    }),
    createUtilityAccount,
  )
  .get(protect, getUtilityAccounts);

router.post(
  "/bulk",
  protect,
  authorize(RESOURCES.UTILITY_ACCOUNT, ACTIONS.CREATE, {
    resolveContext: (req) => ({ facilityId: req.body?.facility_id }),
  }),
  bulkCreateUtilityAccounts,
);

router.post(
  "/:id/audit-step-submit",
  protect,
  authorize(RESOURCES.UTILITY_AUDIT_FLOW, ACTIONS.SUBMIT_AUDIT_STEP, {
    resolveContext: resolveUtilityFacilityContext,
  }),
  submitUtilityAuditStep,
);
router.post(
  "/:id/audit-step-allow",
  protect,
  authorize(RESOURCES.UTILITY_AUDIT_FLOW, ACTIONS.ALLOW_AUDIT_STEP, {
    resolveContext: resolveUtilityFacilityContext,
  }),
  allowUtilityAuditStep,
);
router.post(
  "/:id/open-audit",
  protect,
  authorize(RESOURCES.UTILITY_AUDIT_FLOW, ACTIONS.ALLOW_AUDIT_STEP, {
    resolveContext: resolveUtilityFacilityContext,
  }),
  openUtilityAudit,
);

router
  .route("/:id")
  .get(
    protect,
    authorize(RESOURCES.UTILITY_ACCOUNT, ACTIONS.READ, {
      resolveContext: resolveUtilityFacilityContext,
    }),
    getUtilityAccountById,
  )
  .put(
    protect,
    authorize(RESOURCES.UTILITY_ACCOUNT, ACTIONS.UPDATE, {
      resolveContext: resolveUtilityFacilityContext,
    }),
    uploadDocuments,
    updateUtilityAccount,
  )
  .delete(
    protect,
    authorize(RESOURCES.UTILITY_ACCOUNT, ACTIONS.DELETE, {
      resolveContext: resolveUtilityFacilityContext,
    }),
    deleteUtilityAccount,
  );

router.post(
  "/:id/documents",
  protect,
  authorize(RESOURCES.UTILITY_ACCOUNT, ACTIONS.UPDATE, {
    resolveContext: resolveUtilityFacilityContext,
  }),
  uploadDocuments,
  uploadUtilityAccountDocuments,
);

export default router;
