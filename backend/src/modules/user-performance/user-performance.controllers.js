import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getUserPerformanceSummaryService,
  getUserPerformanceFacilitiesService,
  getUserPerformanceUtilityAccountsService,
  getUserPerformanceCompletedAuditsService,
  getUserPerformancePresenceService,
  getUserPerformancePresenceActivitiesService,
  getUserPerformanceSessionsService,
} from "./user-performance.services.js";

const applyHttpError = (res, error) => {
  if (error?.statusCode) {
    res.status(error.statusCode);
  }
  throw error;
};

export const getUserPerformanceSummary = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await getUserPerformanceSummaryService({
      requester: req.user,
      userId,
    });
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    applyHttpError(res, error);
  }
});

export const getUserPerformanceFacilities = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const facilities = await getUserPerformanceFacilitiesService({
      requester: req.user,
      userId,
    });
    res.status(200).json({
      success: true,
      count: facilities.length,
      data: facilities,
    });
  } catch (error) {
    applyHttpError(res, error);
  }
});

export const getUserPerformanceUtilityAccounts = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const utilities = await getUserPerformanceUtilityAccountsService({
      requester: req.user,
      userId,
    });
    res.status(200).json({
      success: true,
      count: utilities.length,
      data: utilities,
    });
  } catch (error) {
    applyHttpError(res, error);
  }
});

export const getUserPerformanceCompletedAudits = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const completed = await getUserPerformanceCompletedAuditsService({
      requester: req.user,
      userId,
    });
    res.status(200).json({
      success: true,
      count: completed.length,
      data: completed,
    });
  } catch (error) {
    applyHttpError(res, error);
  }
});

export const getUserPerformancePresence = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await getUserPerformancePresenceService({
      requester: req.user,
      userId,
      query: req.query,
    });
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    applyHttpError(res, error);
  }
});

export const getUserPerformancePresenceActivities = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const data = await getUserPerformancePresenceActivitiesService({
      requester: req.user,
      userId,
      query: req.query,
    });
    res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    applyHttpError(res, error);
  }
});

export const getUserPerformanceSessions = asyncHandler(async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await getUserPerformanceSessionsService({
      requester: req.user,
      userId,
      query: req.query,
    });
    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions,
    });
  } catch (error) {
    applyHttpError(res, error);
  }
});
