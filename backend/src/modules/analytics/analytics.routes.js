import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { getAnalytics } from "./analytics.controllers.js";

const router = express.Router();

router.get("/", protect, getAnalytics);

export default router;
