import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  createMessage,
  getMessages,
  getConversations,
  getUnreadCount,
  getMessageById,
  markAsRead,
  markConversationRead,
  markAllAsRead,
  deleteMessage,
  getGraphStatus,
  getGraphMailSenders,
  syncGraphInbox,
} from "./message.controllers.js";

const router = express.Router();

router.route("/").post(protect, createMessage).get(protect, getMessages);

router.get("/conversations", protect, getConversations);
router.put("/conversations/:userId/read", protect, markConversationRead);
router.get("/unread-count", protect, getUnreadCount);
router.put("/read-all", protect, markAllAsRead);
router.get("/graph/status", protect, getGraphStatus);
router.get("/graph/senders", protect, getGraphMailSenders);
router.post("/graph/sync", protect, syncGraphInbox);

router.put("/:id/read", protect, markAsRead);
router.route("/:id").get(protect, getMessageById).delete(protect, deleteMessage);

export default router;
