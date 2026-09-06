import express from "express";
import { protect } from "./auth.middlewares.js";
import {
  loginUser,
  initiateLogin,
  verifyLoginOtp,
  resendLoginOtp,
  registerUser,
  getUserProfile,
  updateUserProfile,
  refreshAccessToken,
  userLogout,
  refreshSessionTimer,
  getAuditors,
  updateUser,
  deleteUser,
} from "./auth.controllers.js";
import {
  apiRateLimiter,
  authRateLimiter,
} from "../../middlewares/rateLimitLoggerMiddleware.js";

const router = express.Router();

// 🔐 Auth
router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);
router.post("/login/initiate", authRateLimiter, initiateLogin);
router.post("/login/verify-otp", authRateLimiter, verifyLoginOtp);
router.post("/login/resend-otp", authRateLimiter, resendLoginOtp);
router.post("/refresh", apiRateLimiter, refreshAccessToken);
router.post("/logout", userLogout);
router.post("/refresh-timer", protect, refreshSessionTimer);

// 👤 Profile
router.route("/profile").get(protect, getUserProfile).put(protect, updateUserProfile);

// 👥 Users
router.get("/auditors", protect, getAuditors);

// ✏️ Edit + Delete
router.route("/:id").put(protect, updateUser).delete(protect, deleteUser);

export default router;
