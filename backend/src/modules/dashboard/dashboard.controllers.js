import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getDashboardStatsService,
  getDashboardRecentActivitiesService,
  getDashboardUserAppearanceService,
  getDashboardOverviewService,
  getDashboardSummaryService,
  getDashboardRecentFacilitiesService,
} from "./dashboard.services.js";

// @desc    Get only dashboard stats
// @route   GET /api/v1/dashboard/stats
// @access  Protected
export const getDashboardStats = asyncHandler(async (req, res) => {
  const data = await getDashboardStatsService({ user: req.user });
  res.json({
    success: true,
    data,
  });
});

// @desc    Get recent dashboard activities
// @route   GET /api/v1/dashboard/recent-activities
// @access  Protected
export const getDashboardRecentActivities = asyncHandler(async (req, res) => {
  const activities = await getDashboardRecentActivitiesService({ user: req.user });
  res.json({
    success: true,
    count: activities.length,
    data: activities,
  });
});

// @desc    Get dashboard user appearance from PresenceLog
// @route   GET /api/v1/dashboard/user-appearance
// @access  Protected
export const getDashboardUserAppearance = asyncHandler(async (req, res) => {
  const appearance = await getDashboardUserAppearanceService({ user: req.user });
  res.json({
    success: true,
    count: appearance.length,
    data: appearance,
  });
});

// @desc    Get full dashboard overview
// @route   GET /api/v1/dashboard/overview
// @access  Protected
export const getDashboardOverview = asyncHandler(async (req, res) => {
  const data = await getDashboardOverviewService({ user: req.user });
  res.json({
    success: true,
    data,
  });
});

// @desc    Get lightweight dashboard summary counts
// @route   GET /api/v1/dashboard/summary
// @access  Protected
export const getDashboardSummary = asyncHandler(async (req, res) => {
  const data = await getDashboardSummaryService({ user: req.user });
  res.json({
    success: true,
    data,
  });
});

// @desc    Get recent facilities with utility progress
// @route   GET /api/v1/dashboard/recent-facilities
// @access  Protected
export const getDashboardRecentFacilities = asyncHandler(async (req, res) => {
  const limit = req.query.limit;
  const data = await getDashboardRecentFacilitiesService({
    user: req.user,
    limit,
  });
  res.json({
    success: true,
    count: data.length,
    data,
  });
});
