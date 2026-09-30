import express from "express";
import { protect, admin } from "../../middlewares/authMiddleware.js";
import {
  createApiKey,
  getApiKeys,
  updateApiKeyStatus,
  deleteApiKey,
} from "./api-key.controllers.js";

const router = express.Router();

// All API key management routes require Admin or Super Admin auth
router.use(protect, admin);

router.route("/")
  .get(getApiKeys)
  .post(createApiKey);

router.patch("/:id/status", updateApiKeyStatus);
router.delete("/:id", deleteApiKey);

export default router;
