import { modelsRegistry } from "../../data/modelRegistry.js";
const { Notification } = modelsRegistry;


// ─── Services ─────────────────────────────────────────────────────────────────

/**
 * Get notifications for the requesting user.
 * super_admin + `?all=true` → all notifications in the system.
 */
export async function getNotificationsService({ user, queryAll }) {
  let query = { recipient: user._id };

  if (user.role === "super_admin" && queryAll === "true") {
    query = {}; // all notifications
  }

  return Notification.find(query)
    .populate("recipient", "name email")
    .populate("sender", "name email")
    .sort({ created_at: -1 })
    .limit(50);
}

/**
 * Mark a single notification as read.
 * super_admin + `?all=true` sets `superAdminRead` instead of `isRead`.
 */
export async function markAsReadService({ user, notificationId, queryAll }) {
  let query = { _id: notificationId };
  let update = { isRead: true };

  if (user.role === "super_admin" && queryAll === "true") {
    update = { superAdminRead: true };
  } else {
    query.recipient = user._id;
  }

  const notification = await Notification.findOneAndUpdate(query, update, { new: true });

  if (!notification) {
    const err = new Error("Notification not found");
    err.statusCode = 404;
    throw err;
  }

  return notification;
}

/**
 * Mark all notifications as read for the requesting user.
 * super_admin + `?all=true` sets `superAdminRead` on all notifications.
 */
export async function markAllAsReadService({ user, queryAll }) {
  let query = { isRead: false };
  let update = { isRead: true };

  if (user.role === "super_admin" && queryAll === "true") {
    query = { superAdminRead: false };
    update = { superAdminRead: true };
  } else {
    query.recipient = user._id;
  }

  await Notification.updateMany(query, update);
}
