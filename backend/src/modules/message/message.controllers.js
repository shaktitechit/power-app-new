import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createMessageService,
  getMessagesService,
  getConversationsService,
  getUnreadCountService,
  getMessageByIdService,
  markAsReadService,
  markConversationReadService,
  markAllAsReadService,
  deleteMessageService,
  getGraphStatusService,
  getGraphMailSendersService,
  syncGraphInboxService,
} from "./message.services.js";

// POST /api/v1/messages
export const createMessage = asyncHandler(async (req, res) => {
  const data = await createMessageService({
    user: req.user,
    body: req.body,
    io: req.app.get("io"),
  });
  return res.status(201).json({
    success: true,
    message: "Message sent successfully",
    data,
  });
});

// GET /api/v1/messages
export const getMessages = asyncHandler(async (req, res) => {
  const data = await getMessagesService({ user: req.user, query: req.query });
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/messages/conversations
export const getConversations = asyncHandler(async (req, res) => {
  const data = await getConversationsService({ user: req.user });
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/messages/unread-count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const data = await getUnreadCountService({ user: req.user });
  return res.status(200).json({ success: true, data });
});

// GET /api/v1/messages/:id
export const getMessageById = asyncHandler(async (req, res) => {
  const data = await getMessageByIdService({
    user: req.user,
    messageId: req.params.id,
  });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/messages/:id/read
export const markAsRead = asyncHandler(async (req, res) => {
  const data = await markAsReadService({
    user: req.user,
    messageId: req.params.id,
  });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/messages/conversations/:userId/read
export const markConversationRead = asyncHandler(async (req, res) => {
  await markConversationReadService({
    user: req.user,
    withUserId: req.params.userId,
  });
  return res.status(200).json({
    success: true,
    message: "Conversation marked as read",
  });
});

// PUT /api/v1/messages/read-all
export const markAllAsRead = asyncHandler(async (req, res) => {
  await markAllAsReadService({ user: req.user });
  return res.status(200).json({
    success: true,
    message: "All messages marked as read",
  });
});

// DELETE /api/v1/messages/:id
export const deleteMessage = asyncHandler(async (req, res) => {
  await deleteMessageService({ user: req.user, messageId: req.params.id });
  return res.status(200).json({
    success: true,
    message: "Message deleted successfully",
  });
});

// GET /api/v1/messages/graph/status
export const getGraphStatus = asyncHandler(async (_req, res) => {
  const data = getGraphStatusService();
  return res.status(200).json({ success: true, data });
});

// GET /api/v1/messages/graph/senders
export const getGraphMailSenders = asyncHandler(async (_req, res) => {
  const data = await getGraphMailSendersService();
  return res.status(200).json({
    success: true,
    count: data.data.length,
    ...data,
  });
});

// POST /api/v1/messages/graph/sync
export const syncGraphInbox = asyncHandler(async (req, res) => {
  const data = await syncGraphInboxService({ user: req.user, query: req.query });
  return res.status(200).json({
    success: true,
    message: "Microsoft Graph inbox synced",
    ...data,
  });
});
