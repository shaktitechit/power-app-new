import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";
import { onlineUsers } from "../../socket/socketServer.js";
import {
  isMicrosoftGraphConfigured,
  MICROSOFT_GRAPH_MAILBOX,
} from "../../config/microsoftGraph.js";
import {
  listGraphInbox,
  markGraphMessageRead,
  resolveGraphFromMailbox,
  sendGraphMail,
  listGraphMailSenders,
} from "../../services/microsoftGraph/graphMail.js";
import { buildBrandedEmailHtml } from "./emailTemplate.js";

const { Message, User } = modelsRegistry;

const MESSAGE_POPULATE = [
  { path: "sender", select: "name email role" },
  { path: "recipient", select: "name email role" },
];

function throwError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function toIdString(value) {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

export function buildConversationKey(userA, userB) {
  return [String(userA), String(userB)].sort().join("_");
}

function parseLimit(query, fallback = 50) {
  const parsed = Number.parseInt(query?.limit, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, 200);
}

function parseSkip(query) {
  const parsed = Number.parseInt(query?.skip, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return parsed;
}

function isSuperAdminAll(user, queryAll) {
  return user?.role === "super_admin" && String(queryAll) === "true";
}

function visibleToUserFilter(userId) {
  return { hidden_for: { $nin: [userId] } };
}

function participantFilter(userId) {
  return {
    $or: [{ sender: userId }, { recipient: userId }],
    ...visibleToUserFilter(userId),
  };
}

async function populateMessage(message) {
  if (!message) return null;
  return Message.populate(message, MESSAGE_POPULATE);
}

async function emitNewMessage(io, message) {
  if (!io || !message) return;
  const payload = await populateMessage(message);
  const recipientId = toIdString(payload.recipient);
  const senderId = toIdString(payload.sender);

  const recipientSocketId = onlineUsers.get(recipientId);
  if (recipientSocketId) {
    io.to(recipientSocketId).emit("new-message", payload);
  }

  const senderSocketId = onlineUsers.get(senderId);
  if (senderSocketId && senderSocketId !== recipientSocketId) {
    io.to(senderSocketId).emit("new-message", payload);
  }
}

export async function createMessageService({ user, body, io }) {
  const recipientId = toObjectId(body?.recipient);
  const text = String(body?.body || "").trim();

  if (!recipientId) throwError("A valid recipient is required");
  if (!text) throwError("Message body is required");
  if (String(recipientId) === String(user._id)) {
    throwError("You cannot send a message to yourself");
  }

  const recipient = await User.findById(recipientId).select("_id status email name").lean();
  if (!recipient) throwError("Recipient not found", 404);

  const senderEmail = String(user?.email || "").trim().toLowerCase() || null;
  const recipientEmail = String(recipient.email || "").trim().toLowerCase() || null;
  const subject = String(body?.subject || "").trim();
  const useGraph = isMicrosoftGraphConfigured() && body?.send_via_graph !== false;

  const referenceId = body?.reference_id ? toObjectId(body.reference_id) : null;
  if (body?.reference_id && !referenceId) {
    throwError("Invalid reference_id");
  }

  const message = await Message.create({
    sender: user._id,
    recipient: recipientId,
    body: text,
    subject,
    conversation_key: buildConversationKey(user._id, recipientId),
    reference_type: body?.reference_type || null,
    reference_id: referenceId,
    channel: useGraph ? "graph" : "internal",
    direction: "outbound",
    sender_email: senderEmail,
    recipient_email: recipientEmail,
    graph_status: useGraph ? "pending" : null,
  });

  if (useGraph) {
    if (!recipientEmail) {
      message.graph_status = "failed";
      message.graph_error = "Recipient has no email address";
      await message.save();
      throwError("Recipient has no email address for Microsoft Graph mail", 400);
    }

    try {
      const mailSubject = subject || `Message from ${user.name || senderEmail || "Power App"}`;
      const branded = await buildBrandedEmailHtml({
        senderName: user.name,
        senderEmail,
        recipientName: recipient.name,
        subject: mailSubject,
        message: text,
      });
      const graphResult = await sendGraphMail({
        fromMailbox: resolveGraphFromMailbox(senderEmail),
        toEmail: recipientEmail,
        subject: mailSubject,
        body: text,
        html: branded.html,
        attachments: branded.logoAttachment ? [branded.logoAttachment] : undefined,
      });
      message.graph_status = "sent";
      message.graph_error = null;
      message.graph_message_id = graphResult?.graph_message_id || null;
      message.graph_conversation_id = graphResult?.graph_conversation_id || null;
      await message.save();
    } catch (error) {
      message.graph_status = "failed";
      message.graph_error = error.message;
      await message.save();
      throwError(error.message || "Failed to send mail via Microsoft Graph", error.statusCode || 502);
    }
  }

  const populated = await populateMessage(message);
  await emitNewMessage(io, populated);
  return populated;
}

export async function getMessagesService({ user, query }) {
  const limit = parseLimit(query);
  const skip = parseSkip(query);
  const withUserId = query?.with ? toObjectId(query.with) : null;

  if (query?.with && !withUserId) throwError("Invalid user id in `with`");

  let filter;
  if (isSuperAdminAll(user, query?.all) && !withUserId) {
    filter = {};
  } else if (withUserId) {
    filter = {
      conversation_key: buildConversationKey(user._id, withUserId),
      ...visibleToUserFilter(user._id),
    };
  } else {
    filter = participantFilter(user._id);
  }

  if (String(query?.unread) === "true") {
    filter.is_read = false;
    if (!isSuperAdminAll(user, query?.all)) {
      filter.recipient = user._id;
    }
  }

  return Message.find(filter)
    .populate(MESSAGE_POPULATE)
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limit);
}

export async function getConversationsService({ user }) {
  const userId = toObjectId(user._id);

  const rows = await Message.aggregate([
    { $match: participantFilter(userId) },
    { $sort: { created_at: -1 } },
    {
      $group: {
        _id: "$conversation_key",
        last_message: { $first: "$$ROOT" },
        unread_count: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$recipient", userId] },
                  { $eq: ["$is_read", false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { "last_message.created_at": -1 } },
  ]);

  const senderIds = rows.map((row) => row.last_message.sender);
  const recipientIds = rows.map((row) => row.last_message.recipient);
  const users = await User.find({
    _id: { $in: [...senderIds, ...recipientIds] },
  })
    .select("name email role")
    .lean();
  const usersById = new Map(users.map((u) => [String(u._id), u]));

  return rows.map((row) => {
    const last = row.last_message;
    const otherId =
      String(last.sender) === String(user._id) ? last.recipient : last.sender;
    return {
      conversation_key: row._id,
      other_user: usersById.get(String(otherId)) || null,
      unread_count: row.unread_count,
      last_message: {
        ...last,
        sender: usersById.get(String(last.sender)) || last.sender,
        recipient: usersById.get(String(last.recipient)) || last.recipient,
      },
    };
  });
}

export async function getUnreadCountService({ user }) {
  const count = await Message.countDocuments({
    recipient: user._id,
    is_read: false,
    ...visibleToUserFilter(user._id),
  });
  return { count };
}

export async function getMessageByIdService({ user, messageId }) {
  const id = toObjectId(messageId);
  if (!id) throwError("Invalid message id");

  const message = await Message.findById(id).populate(MESSAGE_POPULATE);
  if (!message) throwError("Message not found", 404);

  const uid = String(user._id);
  const isParticipant =
    String(message.sender?._id || message.sender) === uid ||
    String(message.recipient?._id || message.recipient) === uid;

  if (!isParticipant && user.role !== "super_admin") {
    throwError("Access denied", 403);
  }

  const hidden = (message.hidden_for || []).some((idValue) => String(idValue) === uid);
  if (hidden && user.role !== "super_admin") {
    throwError("Message not found", 404);
  }

  return message;
}

export async function markAsReadService({ user, messageId }) {
  const id = toObjectId(messageId);
  if (!id) throwError("Invalid message id");

  const message = await Message.findOneAndUpdate(
    { _id: id, recipient: user._id, ...visibleToUserFilter(user._id) },
    { is_read: true, read_at: new Date() },
    { new: true },
  ).populate(MESSAGE_POPULATE);

  if (!message) throwError("Message not found", 404);

  if (message.graph_message_id) {
    try {
      await markGraphMessageRead(message.graph_message_id);
    } catch {
      // Local read still succeeds if Graph is unavailable.
    }
  }

  return message;
}

export async function markConversationReadService({ user, withUserId }) {
  const otherId = toObjectId(withUserId);
  if (!otherId) throwError("A valid user id is required");

  await Message.updateMany(
    {
      conversation_key: buildConversationKey(user._id, otherId),
      recipient: user._id,
      is_read: false,
      ...visibleToUserFilter(user._id),
    },
    { is_read: true, read_at: new Date() },
  );
}

export async function markAllAsReadService({ user }) {
  await Message.updateMany(
    {
      recipient: user._id,
      is_read: false,
      ...visibleToUserFilter(user._id),
    },
    { is_read: true, read_at: new Date() },
  );
}

export async function deleteMessageService({ user, messageId }) {
  const id = toObjectId(messageId);
  if (!id) throwError("Invalid message id");

  const message = await Message.findById(id);
  if (!message) throwError("Message not found", 404);

  const uid = String(user._id);
  const isSender = String(message.sender) === uid;
  const isRecipient = String(message.recipient) === uid;

  if (!isSender && !isRecipient && user.role !== "super_admin") {
    throwError("Access denied", 403);
  }

  if (user.role === "super_admin" && !isSender && !isRecipient) {
    await message.softDelete();
    return;
  }

  if (isSender && isRecipient) {
    await message.softDelete();
    return;
  }

  const alreadyHidden = (message.hidden_for || []).some(
    (idValue) => String(idValue) === uid,
  );
  if (!alreadyHidden) {
    message.hidden_for.push(user._id);
    await message.save();
  }
}

function graphAddress(entity) {
  return String(entity?.emailAddress?.address || "").trim().toLowerCase();
}

function graphBodyText(graphMessage) {
  const preview = String(graphMessage?.bodyPreview || "").trim();
  if (preview) return preview;
  const content = String(graphMessage?.body?.content || "");
  return content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function findUserByEmail(email) {
  if (!email) return null;
  return User.findOne({ email }).select("_id name email role").lean();
}

export function getGraphStatusService() {
  const configured = isMicrosoftGraphConfigured();
  return {
    configured,
    mailbox: configured ? MICROSOFT_GRAPH_MAILBOX : null,
    from_mode: "user",
  };
}

export async function getGraphMailSendersService() {
  if (!isMicrosoftGraphConfigured()) {
    return { configured: false, mailbox: null, data: [] };
  }

  try {
    const data = await listGraphMailSenders();
    return {
      configured: true,
      mailbox: MICROSOFT_GRAPH_MAILBOX || null,
      data,
    };
  } catch {
    const mailbox = String(MICROSOFT_GRAPH_MAILBOX || "").trim().toLowerCase();
    return {
      configured: true,
      mailbox: MICROSOFT_GRAPH_MAILBOX || null,
      data: mailbox ? [{ name: mailbox, email: mailbox }] : [],
    };
  }
}

export async function syncGraphInboxService({ user, query }) {
  if (!isMicrosoftGraphConfigured()) {
    throwError("Microsoft Graph is not configured", 503);
  }

  const mailboxUser = await findUserByEmail(String(MICROSOFT_GRAPH_MAILBOX).toLowerCase());
  const inbox = await listGraphInbox({
    top: query?.limit,
    skip: query?.skip,
  });
  const items = Array.isArray(inbox?.value) ? inbox.value : [];

  let imported = 0;
  let skipped = 0;
  const data = [];

  for (const item of items) {
    if (!item?.id) {
      skipped += 1;
      continue;
    }

    const existing = await Message.findOne({ graph_message_id: item.id });
    if (existing) {
      skipped += 1;
      data.push(existing);
      continue;
    }

    const fromEmail = graphAddress(item.from);
    const toEmails = (item.toRecipients || []).map(graphAddress).filter(Boolean);
    const senderUser = await findUserByEmail(fromEmail);
    let recipientUser = mailboxUser;

    if (!recipientUser) {
      for (const email of toEmails) {
        recipientUser = await findUserByEmail(email);
        if (recipientUser) break;
      }
    }

    if (!senderUser || !recipientUser) {
      skipped += 1;
      continue;
    }

    const created = await Message.create({
      sender: senderUser._id,
      recipient: recipientUser._id,
      body: graphBodyText(item) || item.subject || "(empty message)",
      subject: item.subject || "",
      conversation_key: buildConversationKey(senderUser._id, recipientUser._id),
      channel: "graph",
      direction: "inbound",
      sender_email: fromEmail || null,
      recipient_email: toEmails[0] || String(MICROSOFT_GRAPH_MAILBOX).toLowerCase(),
      graph_message_id: item.id,
      graph_conversation_id: item.conversationId || null,
      graph_status: "received",
      is_read: Boolean(item.isRead),
      read_at: item.isRead ? new Date() : null,
      created_at: item.receivedDateTime ? new Date(item.receivedDateTime) : undefined,
    });

    imported += 1;
    data.push(created);
  }

  return {
    imported,
    skipped,
    count: data.length,
    data: user?.role === "super_admin" ? data : data.filter((row) => {
      const uid = String(user._id);
      return String(row.sender) === uid || String(row.recipient) === uid;
    }),
  };
}
