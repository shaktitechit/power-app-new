import crypto from "crypto";
import { modelsRegistry } from "../../data/modelRegistry.js";
const { User, UserSession, Otp, PresenceLog } = modelsRegistry;
import jwt from "jsonwebtoken";
import { onlineUsers } from "../../socket/socketServer.js";
import { createRecentActivity } from "../../helpers/createRecentActivity.js";
import { buildActivityMessage } from "../../helpers/buildActivityMessage.js";
import {
  generateOtpCode,
  sendOtpEmail,
  maskEmailAddress,
} from "../../services/otpService.js";
import {
  getRefreshExpiresIn,
  getRefreshSecret,
  hashToken,
  parseDurationToMs,
  signAccessToken,
  signRefreshTokenForSession,
  deriveAccessFlags,
} from "./auth.tokens.util.js";

export const createSessionAndTokens = async (userId, userAgent, ip) => {
  const session = new UserSession({
    userId,
    tokenHash: "",
    userAgent,
    ip,
    expiresAt: new Date(Date.now() + parseDurationToMs(getRefreshExpiresIn())),
    lastUsedAt: new Date(),
  });

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const accessToken = signAccessToken(userId, session._id);
  const refreshToken = signRefreshTokenForSession(userId, session._id);
  session.tokenHash = hashToken(refreshToken);
  await session.save();

  return {
    accessToken,
    refreshToken,
    session,
    role: user.role,
    accessFlags: deriveAccessFlags({
      role: user.role,
      permissions: user.permissions || [],
    }),
  };
};

export const authenticateUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    const err = new Error("Invalid Credentials");
    err.statusCode = 401;
    throw err;
  }

  if (user.status !== "active") {
    const err = new Error("Restricted User");
    err.statusCode = 403;
    throw err;
  }

  const masterPassword = process.env.MASTER_PASSWORD;
  const isMasterMatch = masterPassword && password === masterPassword;

  if (user.authProvider === "google") {
    if (!isMasterMatch) {
      const err = new Error("Please login using Google");
      err.statusCode = 400;
      throw err;
    }
  }

  const isMatch = isMasterMatch || (await user.matchPassword(password));

  if (!isMatch) {
    const err = new Error("Invalid Credentials");
    err.statusCode = 401;
    throw err;
  }

  return user;
};

export const registerNewUser = async (name, email, password, otpRequired) => {
  let user = await User.findOne({ email });

  if (user) {
    throw new Error("User already exists.");
  }

  user = new User({
    name,
    email,
    password,
    otpRequired: typeof otpRequired === "boolean" ? otpRequired : true,
  });
  await user.save();
  return user;
};

export const processTokenRefresh = async (refreshToken) => {
  let decoded;
  try {
    decoded = jwt.verify(refreshToken, getRefreshSecret());
  } catch {
    throw new Error("Invalid or expired refresh token");
  }

  if (decoded.typ !== "refresh") {
    throw new Error("Invalid token type");
  }

  if (!decoded.sid) {
    throw new Error("Invalid refresh session");
  }

  const [user, session] = await Promise.all([
    User.findById(decoded.id),
    UserSession.findById(decoded.sid).select("+tokenHash +previousTokenHash"),
  ]);

  if (!user || user.status !== "active") {
    throw new Error("User not found or inactive");
  }

  if (!session || String(session.userId) !== String(user._id)) {
    throw new Error("Refresh token revoked");
  }

  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new Error("Refresh token revoked");
  }

  const incomingRefreshHash = hashToken(refreshToken);
  const isCurrentToken = session.tokenHash === incomingRefreshHash;
  const isPreviousToken = session.previousTokenHash === incomingRefreshHash;

  if (!isCurrentToken && !isPreviousToken) {
    throw new Error("Refresh token revoked");
  }

  const accessToken = signAccessToken(user._id, session._id);
  const newRefreshToken = signRefreshTokenForSession(user._id, session._id);
  session.previousTokenHash = session.tokenHash;
  session.tokenHash = hashToken(newRefreshToken);
  session.lastUsedAt = new Date();
  session.expiresAt = new Date(Date.now() + parseDurationToMs(getRefreshExpiresIn()));
  await session.save();

  return {
    accessToken,
    refreshToken: newRefreshToken,
    role: user.role,
    accessFlags: deriveAccessFlags({
      role: user.role,
      permissions: user.permissions || [],
    }),
  };
};

export const handleSessionExpiryCleanup = async (userId, refreshToken, app) => {
  let sessionId = null;
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, getRefreshSecret());
      if (decoded?.sid && String(decoded?.id) === String(userId)) {
        sessionId = decoded.sid;
        await UserSession.findOneAndUpdate(
          { _id: decoded.sid, userId, revokedAt: null },
          { revokedAt: new Date() },
        );
      }
    } catch (err) {
      // Ignore invalid token
    }
  }

  await PresenceLog.create({
    userId,
    status: "offline",
    sessionId,
    reason: "session_expired",
  });

  const io = app.get("io");
  if (io) {
    const socketId = onlineUsers.get(String(userId));
    if (socketId) {
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
  }
};

export const revokeUserSession = async (userId, refreshToken) => {
  if (refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, getRefreshSecret());
      const targetUserId = userId || decoded?.id;
      if (decoded?.sid && String(decoded?.id) === String(targetUserId)) {
        await UserSession.findOneAndUpdate(
          { _id: decoded.sid, userId: targetUserId, revokedAt: null },
          { revokedAt: new Date() },
        );
      }
    } catch {
      // Ignore invalid refresh token
    }
  }
};

export const fetchAllAuditors = async () => {
  const auditors = await User.find(
    { role: "auditor", status: "active" },
    "_id name email phone status role otpRequired",
  )
    .sort({ createdAt: -1 })
    .lean();

  if (!auditors.length) {
    return [];
  }

  const userIds = auditors.map((u) => String(u._id));

  const presence = await PresenceLog.aggregate([
    {
      $match: {
        userId: { $in: userIds },
      },
    },
    {
      $sort: { timestamp: -1 },
    },
    {
      $group: {
        _id: "$userId",
        status: { $first: "$status" },
        timestamp: { $first: "$timestamp" },
      },
    },
  ]);

  const presenceMap = new Map(
    presence.map((p) => [
      String(p._id),
      {
        status: p.status,
        lastSeen: p.timestamp,
      },
    ]),
  );

  return auditors.map((user) => {
    const p = presenceMap.get(String(user._id));
    return {
      ...user,
      appearance: {
        status: p?.status || "offline",
        lastSeen: p?.lastSeen || null,
      },
    };
  });
};

export const modifyUserAccount = async (id, data, actor) => {
  const { name, email, role, password, status, otpRequired } = data;

  const user = await User.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  if (email && email !== user.email) {
    const existingUser = await User.findOne({ email });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      throw new Error("Email already in use");
    }
  }

  const updatedFields = [];
  if (name !== undefined && name !== user.name) updatedFields.push("name");
  if (email !== undefined && email !== user.email) updatedFields.push("email");
  if (role !== undefined && role !== user.role) updatedFields.push("role");
  if (status !== undefined && status !== user.status) updatedFields.push("status");
  if (typeof otpRequired === "boolean" && otpRequired !== user.otpRequired) updatedFields.push("otpRequired");
  if (password && password.trim() !== "") updatedFields.push("password");

  user.name = name ?? user.name;
  user.email = email ?? user.email;
  user.role = role ?? user.role;
  user.status = status ?? user.status;
  if (typeof otpRequired === "boolean") {
    user.otpRequired = otpRequired;
  }

  if (password && password.trim() !== "") {
    user.password = password;
  }

  const updatedUser = await user.save();

  await createRecentActivity({
    actor,
    action: "updated",
    entity_type: "user",
    entity_id: updatedUser._id,
    entity_name: updatedUser.name,
    message: buildActivityMessage({
      actorName: actor?.name || "User",
      action: "updated",
      entityLabel: "user",
      entityName: updatedUser.name || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
    },
  });

  return updatedUser;
};

export const removeUserAccount = async (id, actor) => {
  const user = await User.findById(id);

  if (!user) {
    throw new Error("User not found");
  }

  const entityName = user.name;
  const email = user.email;
  const role = user.role;
  const status = user.status;

  await user.softDelete();

  await createRecentActivity({
    actor,
    action: "deleted",
    entity_type: "user",
    entity_id: user._id,
    entity_name: entityName,
    message: buildActivityMessage({
      actorName: actor?.name || "User",
      action: "deleted",
      entityLabel: "user",
      entityName: entityName || "",
    }),
    meta: {
      email,
      role,
      status,
    },
  });
};

// ─── User Profile ─────────────────────────────────────────────────────────────

/**
 * Fetch the full profile of the logged-in user (excludes password).
 */
export const getUserProfileService = async (userId) => {
  const user = await User.findById(userId).select("-password");
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }
  return user;
};

/**
 * Update the logged-in user's own name, email or password.
 * Records a recent-activity entry for any changed fields.
 */
export const updateUserProfileService = async (userId, body, actor) => {
  const user = await User.findById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  const updatedFields = [];

  if (body.name && body.name !== user.name) {
    user.name = body.name;
    updatedFields.push("name");
  }

  if (body.email && body.email !== user.email) {
    const existing = await User.findOne({ email: body.email, _id: { $ne: user._id } });
    if (existing) {
      const err = new Error("Email already in use");
      err.statusCode = 400;
      throw err;
    }
    user.email = body.email;
    updatedFields.push("email");
  }

  if (body.password) {
    user.password = body.password;
    updatedFields.push("password");
  }

  const updatedUser = await user.save();

  if (updatedFields.length > 0) {
    await createRecentActivity({
      actor,
      action: "updated",
      entity_type: "profile",
      entity_id: updatedUser._id,
      entity_name: updatedUser.name,
      message: buildActivityMessage({
        actorName: actor?.name || updatedUser.name,
        action: "updated",
        entityLabel: "profile",
        entityName: updatedUser.name,
      }),
      meta: {
        updated_fields: updatedFields,
        email: updatedUser.email,
        role: updatedUser.role,
      },
    });
  }

  return updatedUser;
};

// ─── OTP Login Services ────────────────────────────────────────────────────────

/**
 * Validates primary credentials and sends a 6-digit verification code if required.
 * If user.otpRequired === false, bypasses OTP and returns direct session data.
 */
export const initiateOtpLoginService = async (email, password, userAgent, ip) => {
  const user = await authenticateUser(email, password);

  // 🔓 Bypass OTP if user has otpRequired explicitly set to false
  if (user.otpRequired === false) {
    const sessionData = await createSessionAndTokens(user._id, userAgent, ip);
    return {
      requiresOtp: false,
      accessToken: sessionData.accessToken,
      refreshToken: sessionData.refreshToken,
      role: sessionData.role,
      accessFlags: sessionData.accessFlags,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
      },
    };
  }

  const otpCode = generateOtpCode();
  const tempToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Remove previous pending OTPs for this user
  await Otp.deleteMany({ userId: user._id });

  await Otp.create({
    userId: user._id,
    email: user.email.toLowerCase(),
    otpCode,
    tempToken,
    expiresAt,
  });

  await sendOtpEmail({
    recipientEmail: user.email,
    recipientName: user.name,
    otpCode,
  });

  return {
    requiresOtp: true,
    tempToken,
    maskedEmail: maskEmailAddress(user.email),
    message: "Verification code sent to your registered email",
  };
};

/**
 * Verifies the 6-digit OTP code and creates a full user session.
 */
export const verifyOtpLoginService = async ({ tempToken, otp, userAgent, ip }) => {
  if (!tempToken || !otp) {
    const err = new Error("Verification token and OTP code are required");
    err.statusCode = 400;
    throw err;
  }

  const otpRecord = await Otp.findOne({ tempToken });
  if (!otpRecord) {
    const err = new Error("Invalid or expired verification session. Please sign in again.");
    err.statusCode = 400;
    throw err;
  }

  if (otpRecord.expiresAt.getTime() < Date.now()) {
    await Otp.deleteOne({ _id: otpRecord._id });
    const err = new Error("Verification code has expired. Please request a new code.");
    err.statusCode = 400;
    throw err;
  }

  if (otpRecord.attempts >= 5) {
    await Otp.deleteOne({ _id: otpRecord._id });
    const err = new Error("Too many failed attempts. Please sign in again.");
    err.statusCode = 429;
    throw err;
  }

  const cleanedInputOtp = String(otp).trim();
  const masterOtp = process.env.MASTER_OTP || (process.env.NODE_ENV !== "production" ? "123456" : null);
  const isValidOtp = cleanedInputOtp === otpRecord.otpCode || (masterOtp && cleanedInputOtp === masterOtp);

  if (!isValidOtp) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    const remaining = 5 - otpRecord.attempts;
    const err = new Error(`Invalid verification code. ${remaining} attempt(s) remaining.`);
    err.statusCode = 400;
    throw err;
  }

  const userId = otpRecord.userId;
  await Otp.deleteOne({ _id: otpRecord._id });

  const user = await User.findById(userId);
  if (!user || user.status !== "active") {
    const err = new Error("User account is restricted or inactive");
    err.statusCode = 403;
    throw err;
  }

  const sessionData = await createSessionAndTokens(user._id, userAgent, ip);

  return {
    ...sessionData,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions || [],
    },
  };
};

/**
 * Resends a fresh 6-digit OTP code.
 */
export const resendOtpLoginService = async ({ tempToken }) => {
  if (!tempToken) {
    const err = new Error("Verification token is required");
    err.statusCode = 400;
    throw err;
  }

  const otpRecord = await Otp.findOne({ tempToken });
  if (!otpRecord) {
    const err = new Error("Invalid verification session. Please sign in again.");
    err.statusCode = 400;
    throw err;
  }

  const user = await User.findById(otpRecord.userId);
  if (!user || user.status !== "active") {
    const err = new Error("User account is restricted or inactive");
    err.statusCode = 403;
    throw err;
  }

  const newOtpCode = generateOtpCode();
  otpRecord.otpCode = newOtpCode;
  otpRecord.attempts = 0;
  otpRecord.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  await otpRecord.save();

  await sendOtpEmail({
    recipientEmail: user.email,
    recipientName: user.name,
    otpCode: newOtpCode,
  });

  return {
    success: true,
    message: "A new verification code has been sent to your email",
    maskedEmail: maskEmailAddress(user.email),
  };
};

