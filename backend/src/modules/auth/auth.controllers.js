import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  cookieDefaults,
  setAuthCookies,
  clearAuthCookies,
} from "./auth.tokens.util.js";
import {
  createSessionAndTokens,
  authenticateUser,
  registerNewUser,
  processTokenRefresh,
  handleSessionExpiryCleanup,
  revokeUserSession,
  fetchAllAuditors,
  modifyUserAccount,
  removeUserAccount,
  getUserProfileService,
  updateUserProfileService,
} from "./auth.services.js";

const extractIp = (req) => {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || null;
};

//@route POST /api/v1/users/login
//@desc Authenticate user
//@access Public
const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await authenticateUser(email, password);

  const ip = extractIp(req);
  const userAgent = req.get("user-agent") || null;

  const { accessToken, refreshToken, role, accessFlags } =
    await createSessionAndTokens(user._id, userAgent, ip);

  setAuthCookies(res, {
    accessToken,
    refreshToken,
    role,
    accessFlags,
  });

  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
  });
});

//@route POST /api/v1/users/register
//@desc Register a new user
//@access Public
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const user = await registerNewUser(name, email, password);

  res.status(201).json({
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

//@route GET /api/v1/users/profile
//@desc Get logged-in user's full profile (excludes password)
//@access Private
const getUserProfile = asyncHandler(async (req, res) => {
  const user = await getUserProfileService(req.user._id);
  return res.status(200).json(user);
});

//@route PUT /api/v1/users/profile
//@desc Update logged-in user's own name, email or password
//@access Private
const updateUserProfile = asyncHandler(async (req, res) => {
  const updatedUser = await updateUserProfileService(req.user._id, req.body, req.user);
  return res.status(200).json({
    message: "Profile updated successfully",
    user: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
    },
  });
});

//@route POST /api/v1/users/refresh
//@desc Issue new access + refresh cookies from refresh token
//@access Public (requires refreshToken cookie)
const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;

  if (!refreshToken) {
    return res.status(401).json({ message: "No refresh token" });
  }

  const { accessToken, refreshToken: newRefreshToken, role, accessFlags } =
    await processTokenRefresh(refreshToken);

  setAuthCookies(res, {
    accessToken,
    refreshToken: newRefreshToken,
    role,
    accessFlags,
  });

  res.json({ ok: true });
});

//@route POST /api/v1/users/refresh-timer
//@desc Refresh the session timer cookie
//@access Private
const refreshSessionTimer = asyncHandler(async (req, res) => {
  const sessionTimer = req.cookies.sessionTimer;
  
  if (!sessionTimer || Number(sessionTimer) < Date.now()) {
    const refreshToken = req.cookies.refreshToken;
    await handleSessionExpiryCleanup(req.user._id, refreshToken, req.app);

    clearAuthCookies(res);
    res.clearCookie("sessionTimer", cookieDefaults());
    
    return res.status(401).json({ message: "Session expired" });
  }

  const expiresInMs = 10 * 60 * 1000;
  const expiresAt = Date.now() + expiresInMs;
  const opts = cookieDefaults();

  res.cookie("sessionTimer", expiresAt.toString(), {
    ...opts,
    maxAge: expiresInMs,
    httpOnly: false,
  });

  res.json({ ok: true, expiresAt });
});

//@route POST /api/v1/users/logout
//@desc POST logged-out user
//@access Private
const userLogout = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies.refreshToken;
  await revokeUserSession(req.user?._id, refreshToken);

  clearAuthCookies(res);

  res.json({ message: "Logged out" });
});

//@route Get /api/v1/users/auditors
//@desc Get all auditors (Protected Route)
//@access Private
const getAuditors = asyncHandler(async (req, res) => {
  const auditorsList = await fetchAllAuditors();
  res.status(200).json({
    success: true,
    count: auditorsList.length,
    data: auditorsList,
  });
});

const updateUser = asyncHandler(async (req, res) => {
  const updatedUser = await modifyUserAccount(req.params.id, req.body, req.user);
  res.status(200).json({
    success: true,
    data: {
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
    },
  });
});

const deleteUser = asyncHandler(async (req, res) => {
  await removeUserAccount(req.params.id, req.user);
  res.status(200).json({
    success: true,
    message: "User deleted successfully",
  });
});

export {
  loginUser,
  registerUser,
  getUserProfile,
  updateUserProfile,
  refreshAccessToken,
  userLogout,
  refreshSessionTimer,
  getAuditors,
  updateUser,
  deleteUser,
};

