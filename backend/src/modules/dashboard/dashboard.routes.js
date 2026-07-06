import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  getDashboardStats,
  getDashboardRecentActivities,
  getDashboardUserAppearance,
  getDashboardOverview,
  getDashboardSummary,
  getDashboardRecentFacilities,
} from "./dashboard.controllers.js";

const router = express.Router();

router.get("/overview", protect, getDashboardOverview);
router.get("/summary", protect, getDashboardSummary);
router.get("/recent-facilities", protect, getDashboardRecentFacilities);
router.get("/stats", protect, getDashboardStats);
router.get("/recent-activities", protect, getDashboardRecentActivities);
router.get("/user-appearance", protect, getDashboardUserAppearance);

export default router;
