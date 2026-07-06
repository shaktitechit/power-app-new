import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getNotificationsService,
  markAsReadService,
  markAllAsReadService,
} from "./notification.services.js";

// GET /api/v1/notifications
export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await getNotificationsService({
    user: req.user,
    queryAll: req.query.all,
  });
  return res.status(200).json({
    success: true,
    count: notifications.length,
    data: notifications,
  });
});

// PUT /api/v1/notifications/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const notification = await markAsReadService({
    user: req.user,
    notificationId: req.params.id,
    queryAll: req.query.all,
  });
  return res.status(200).json({ success: true, data: notification });
});

// PUT /api/v1/notifications/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  await markAllAsReadService({ user: req.user, queryAll: req.query.all });
  return res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});
