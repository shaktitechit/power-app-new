import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { modelsRegistry } from "../../data/modelRegistry.js";
import { VALID_MODES } from "../../constants/modes.js";
import { safeRedisGet } from "../../lib/redisClient.js";
import { cookieDefaults } from "../../utils/authTokens.js";

const { PresenceLog, UserSession } = modelsRegistry;

const MODE_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

function buildModeCookieOptions() {
  return {
    ...cookieDefaults(),
    maxAge: MODE_COOKIE_MAX_AGE_MS,
  };
}

async function splitPresenceLogOnModeSwitch(userId, mode) {
  if (!userId || !isMongoReady()) return;

  try {
    const normalizedUserId = String(userId);
    const presenceKey = `presence:${normalizedUserId}`;
    const currentStatus = await safeRedisGet(presenceKey);

    if (currentStatus !== "online") {
      return;
    }

    await PresenceLog.create({
      userId: normalizedUserId,
      status: "offline",
      reason: "mode-switch-pre",
    });
    await PresenceLog.create({
      userId: normalizedUserId,
      status: "online",
      mode,
      reason: "mode-switch-post",
    });
  } catch (error) {
    console.error("Failed to split presence log on mode change:", error);
  }
}

async function updateSessionLocation(token, location) {
  if (!token || !location || !isMongoReady()) return;

  const { lat, lng, name } = location;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return;
  }

  try {
    const decoded = jwt.decode(token);
    const sessionId = decoded?.sid;

    if (!sessionId || !mongoose.isValidObjectId(sessionId)) {
      return;
    }

    await UserSession.findByIdAndUpdate(sessionId, {
      location: {
        lat,
        lng,
        ...(typeof name === "string" ? { name } : {}),
      },
    });
  } catch (error) {
    console.error("Failed to update location in session:", error);
  }
}

/**
 * Validate the mode, set the httpOnly mode cookie, split presence log session
 * on mode-switch, and optionally update the session location.
 */
export async function setModeService({ res, mode, location, userId, token }) {
  if (!mode || !VALID_MODES.includes(mode)) {
    const err = new Error(
      `Invalid mode. Accepted values are: ${VALID_MODES.join(", ")}`,
    );
    err.statusCode = 400;
    throw err;
  }

  res.cookie("mode", mode, buildModeCookieOptions());

  await splitPresenceLogOnModeSwitch(userId, mode);
  await updateSessionLocation(token, location);

  return { mode };
}

/**
 * Read the current mode from the httpOnly cookie.
 */
export function getModeService({ cookies }) {
  return { mode: cookies?.mode || null };
}

/**
 * Clear the mode cookie.
 */
export function clearModeService({ res }) {
  res.clearCookie("mode", buildModeCookieOptions());
}
