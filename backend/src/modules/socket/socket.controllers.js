import jwt from "jsonwebtoken";
import { modelsRegistry } from "../../data/modelRegistry.js";
import logger from "../../config/logger.js";

const { User } = modelsRegistry;
import { getAccessSecret } from "../auth/auth.tokens.util.js";
import {
  buildSocketLogMeta,
  setPresenceStatus,
  getPresenceStatus,
  createPresenceLog,
  validateUserSession,
  fetchPresenceSnapshot,
} from "./socket.services.js";

export const onlineUsers = new Map();
const heartbeatTimeouts = new Map();
const forcedHeartbeatLogoutSockets = new Set();

const HEARTBEAT_TIMEOUT_SECONDS = 10 * 60;
const HEARTBEAT_TIMEOUT_MS = HEARTBEAT_TIMEOUT_SECONDS * 1000;
const PRESENCE_TTL_SECONDS = HEARTBEAT_TIMEOUT_SECONDS;

export const parseCookie = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

export const handleSocketConnection = async (io, socket) => {
  const userId = socket.handshake.auth.userId;
  
  const cookieHeader = socket.handshake.headers.cookie || "";
  const mode = parseCookie(cookieHeader, "mode");
  const cookieMode = (mode === "onsite" || mode === "offsite") ? mode : null;
  const token = parseCookie(cookieHeader, "jwt");

  let sessionId = null;
  if (token) {
    try {
      const decoded = jwt.verify(token, getAccessSecret());
      if (decoded.sid) {
        sessionId = decoded.sid;
        
        const { isValid, session } = await validateUserSession(sessionId);
        if (!isValid) {
          logger.info("Rejecting socket connection: session expired or revoked", { sessionId });
          socket.emit("force-logout", {
            reason: "session_expired",
            message: "Your session has expired.",
          });
          socket.disconnect(true);
          return;
        }
      }
    } catch (err) {
      logger.warn("Failed to verify socket JWT", { error: err.message });
    }
  }

  const clearHeartbeatTimeout = () => {
    const timeoutId = heartbeatTimeouts.get(socket.id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      heartbeatTimeouts.delete(socket.id);
    }
  };

  const markOffline = async ({ reason, event }) => {
    onlineUsers.delete(userId);
    await setPresenceStatus({
      userId,
      status: "offline",
    });
    await createPresenceLog({
      userId,
      status: "offline",
      sessionId,
      reason,
    });
    io.emit("user-offline", { userId, reason });
    logger.info(
      "User status changed to offline",
      buildSocketLogMeta(socket, {
        event,
        status: "offline",
        reason,
      }),
    );
  };

  const scheduleHeartbeatTimeout = () => {
    clearHeartbeatTimeout();
    const timeoutId = setTimeout(async () => {
      try {
        forcedHeartbeatLogoutSockets.add(socket.id);
        await markOffline({
          reason: "heartbeat_timeout",
          event: "heartbeat-timeout",
        });
        socket.emit("force-logout", {
          reason: "heartbeat_timeout",
          message: "Logged out due to no heartbeat for 10 minutes.",
        });
        socket.disconnect(true);
      } catch (error) {
        logger.error(
          "Heartbeat timeout handling failed",
          buildSocketLogMeta(socket, {
            event: "heartbeat-timeout",
            error: error?.message,
            stack: error?.stack,
          }),
        );
      } finally {
        clearHeartbeatTimeout();
      }
    }, HEARTBEAT_TIMEOUT_MS);
    heartbeatTimeouts.set(socket.id, timeoutId);
  };

  if (!userId) {
    logger.logSecurity({
      message: "Socket connection rejected: missing userId",
      type: "socket_auth_invalid",
      ip:
        socket.handshake.headers["x-forwarded-for"] ||
        socket.handshake.address ||
        null,
      meta: {
        socketId: socket.id,
        userAgent: socket.handshake.headers["user-agent"] || null,
      },
    });

    socket.disconnect();
    return;
  }

  try {
    logger.info(
      "Socket user connected",
      buildSocketLogMeta(socket, { event: "connection" }),
    );

    onlineUsers.set(userId, socket.id);

    const dbUser = await User.findById(userId);
    if (dbUser && dbUser.role === "super_admin") {
      socket.join("super-admins");
      logger.info(`User ${userId} joined super-admins room`);
    }

    await setPresenceStatus({
      userId,
      status: "online",
      ttl: PRESENCE_TTL_SECONDS,
    });

    await createPresenceLog({
      userId,
      status: "online",
      sessionId,
      reason: "connection",
      mode: cookieMode,
    });

    io.emit("user-online", { userId });
    scheduleHeartbeatTimeout();

    logger.info(
      "User marked online",
      buildSocketLogMeta(socket, { status: "online" }),
    );

    const snapshot = await fetchPresenceSnapshot();
    socket.emit("presence-snapshot", snapshot);

    logger.info(
      "Presence snapshot sent",
      buildSocketLogMeta(socket, {
        event: "presence-snapshot",
      }),
    );
  } catch (error) {
    logger.error(
      "Failed during socket connection setup",
      buildSocketLogMeta(socket, {
        error: error?.message,
        stack: error?.stack,
      }),
    );
  }

  socket.on("heartbeat", async () => {
    try {
      if (sessionId && /^[0-9a-fA-F]{24}$/.test(sessionId)) {
        const { isValid } = await validateUserSession(sessionId);
        if (!isValid) {
          logger.info(
            "Disconnecting socket: session expired or revoked",
            buildSocketLogMeta(socket, { event: "heartbeat", sessionId })
          );
          
          await createPresenceLog({
            userId,
            status: "offline",
            sessionId,
            reason: "session_expired",
          });
          
          socket.emit("force-logout", {
            reason: "session_expired",
            message: "Your session has expired.",
          });
          
          socket.disconnect(true);
          return;
        }
      }

      const currentStatus = await getPresenceStatus(userId);
      const statusToKeep =
        currentStatus === "away" || currentStatus === "online"
          ? currentStatus
          : "online";

      await setPresenceStatus({
        userId,
        status: statusToKeep,
        ttl: PRESENCE_TTL_SECONDS,
      });
      scheduleHeartbeatTimeout();

      logger.info(
        "Heartbeat received",
        buildSocketLogMeta(socket, {
          event: "heartbeat",
          status: statusToKeep,
        }),
      );
    } catch (error) {
      logger.error(
        "Heartbeat handling failed",
        buildSocketLogMeta(socket, {
          event: "heartbeat",
          error: error?.message,
          stack: error?.stack,
        }),
      );
    }
  });

  socket.on("user-online", async () => {
    try {
      await setPresenceStatus({
        userId,
        status: "online",
        ttl: PRESENCE_TTL_SECONDS,
      });

      await createPresenceLog({
        userId,
        status: "online",
        sessionId,
        reason: "user-online",
        mode: cookieMode,
      });

      io.emit("user-online", { userId });
      scheduleHeartbeatTimeout();

      logger.info(
        "User status changed to online",
        buildSocketLogMeta(socket, {
          event: "user-online",
          status: "online",
        }),
      );
    } catch (error) {
      logger.error(
        "Failed to set user online",
        buildSocketLogMeta(socket, {
          event: "user-online",
          error: error?.message,
          stack: error?.stack,
        }),
      );
    }
  });

  socket.on("user-away", async () => {
    try {
      await setPresenceStatus({
        userId,
        status: "away",
        ttl: PRESENCE_TTL_SECONDS,
      });

      await createPresenceLog({
        userId,
        status: "away",
        sessionId,
        reason: "user-away",
      });

      io.emit("user-away", { userId });
      scheduleHeartbeatTimeout();

      logger.info(
        "User status changed to away",
        buildSocketLogMeta(socket, {
          event: "user-away",
          status: "away",
        }),
      );
    } catch (error) {
      logger.error(
        "Failed to set user away",
        buildSocketLogMeta(socket, {
          event: "user-away",
          error: error?.message,
          stack: error?.stack,
        }),
      );
    }
  });

  socket.on("user-offline", async () => {
    try {
      clearHeartbeatTimeout();
      await markOffline({
        reason: "user-offline",
        event: "user-offline",
      });
    } catch (error) {
      logger.error(
        "Failed to set user offline",
        buildSocketLogMeta(socket, {
          event: "user-offline",
          error: error?.message,
          stack: error?.stack,
        }),
      );
    }
  });

  socket.on("disconnect", async (reason) => {
    try {
      clearHeartbeatTimeout();

      if (forcedHeartbeatLogoutSockets.has(socket.id)) {
        forcedHeartbeatLogoutSockets.delete(socket.id);
        return;
      }

      await markOffline({
        reason: "disconnect",
        event: "disconnect",
      });
    } catch (error) {
      logger.error(
        "Disconnect handling failed",
        buildSocketLogMeta(socket, {
          event: "disconnect",
          reason,
          error: error?.message,
          stack: error?.stack,
        }),
      );
    }
  });
};
