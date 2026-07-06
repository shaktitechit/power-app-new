import asyncHandler from "../../middlewares/asyncHandler.js";
import { getAnalyticsService } from "./analytics.services.js";

// @route   GET /api/v1/analytics
// @desc    Get dashboard analytics
// @access  Protected
export const getAnalytics = asyncHandler(async (req, res) => {
  const data = await getAnalyticsService({ user: req.user });

  return res.status(200).json({
    success: true,
    data,
  });
});
