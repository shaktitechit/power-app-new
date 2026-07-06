import { modelsRegistry } from "../../data/modelRegistry.js";
import redisClient from "../../lib/redisClient.js";
import logger from "../../config/logger.js";

const { User, UserSession, PresenceLog } = modelsRegistry;

export const buildSocketLogMeta = (socket, extra = {}) => {
  const userId = socket?.handshake?.auth?.userId || null;
  const forwardedFor = socket?.handshake?.headers?.["x-forwarded-for"];

  let ip = null;
  if (Array.isArray(forwardedFor)) {
    ip = forwardedFor[0];
  } else if (typeof forwardedFor === "string") {
    ip = forwardedFor.split(",")[0].trim();
  } else {
    ip = socket?.handshake?.address || null;
  }

  return {
    socketId: socket?.id || null,
    userId,
    ip,
    userAgent: socket?.handshake?.headers?.["user-agent"] || null,
    transport: socket?.conn?.transport?.name || null,
    ...extra,
  };
};

export const setPresenceStatus = async ({ userId, status, ttl = null }) => {
  const key = `presence:${userId}`;
  if (ttl) {
    await redisClient.set(key, status, { EX: ttl });
  } else {
    await redisClient.set(key, status);
  }
};

export const getPresenceStatus = async (userId) => {
  return await redisClient.get(`presence:${userId}`);
};

export const createPresenceLog = async ({ userId, status, sessionId = null, reason = null, mode = null }) => {
  await PresenceLog.create({
    userId,
    status,
    sessionId,
    reason,
    mode,
  });
};

export const validateUserSession = async (sessionId) => {
  const session = await UserSession.findById(sessionId);
  if (!session) return { isValid: false };

  const isExpired = session.expiresAt.getTime() <= Date.now();
  if (session.revokedAt || isExpired) {
    if (!session.revokedAt && isExpired) {
      await UserSession.findByIdAndUpdate(sessionId, { revokedAt: new Date() });
    }
    return { isValid: false, session };
  }

  return { isValid: true, session };
};

export const fetchPresenceSnapshot = async () => {
  const users = await User.find({}, "_id").lean();
  const entries = await Promise.all(
    users.map(async (user) => {
      const id = user._id.toString();
      const status = (await redisClient.get(`presence:${id}`)) || "offline";
      return [id, status];
    }),
  );
  return Object.fromEntries(entries);
};
