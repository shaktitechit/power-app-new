import { modelsRegistry } from "../../data/modelRegistry.js";
const { PresenceLog, UserSession } = modelsRegistry;
import { VALID_MODES } from "../../constants/modes.js";


import jwt from "jsonwebtoken";
import redisClient from "../../lib/redisClient.js";
import { cookieDefaults } from "../../utils/authTokens.js";

// ─── Services ─────────────────────────────────────────────────────────────────

/**
 * Validate the mode, set the httpOnly mode cookie, split presence log session
 * on mode-switch, and optionally update the session location.
 */
export async function setModeService({ res, mode, location, userId, token }) {
  if (!mode || !VALID_MODES.includes(mode)) {
    const err = new Error(`Invalid mode. Accepted values are: ${VALID_MODES.join(", ")}`);
    err.statusCode = 400;
    throw err;
  }

  res.cookie("mode", mode, {
    ...cookieDefaults(),
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // If user is currently online, split the presence log session
  // so the old mode stops counting and the new mode starts.
  if (userId) {
    try {
      const presenceKey = `presence:${userId}`;
      const currentStatus = await redisClient.get(presenceKey);

      if (currentStatus === "online") {
        await PresenceLog.create({ userId, status: "offline", reason: "mode-switch-pre" });
        await PresenceLog.create({ userId, status: "online", mode, reason: "mode-switch-post" });
      }
    } catch (error) {
      console.error("Failed to split presence log on mode change:", error);
    }
  }

  // Update UserSession with location if provided
  if (location && typeof location.lat === "number" && typeof location.lng === "number") {
    if (token) {
      try {
        const decoded = jwt.decode(token);
        if (decoded?.sid) {
          await UserSession.findByIdAndUpdate(decoded.sid, { location });
        }
      } catch (err) {
        console.error("Failed to update location in session:", err);
      }
    }
  }

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
  res.clearCookie("mode", {
    ...cookieDefaults(),
    sameSite: "strict",
  });
}
