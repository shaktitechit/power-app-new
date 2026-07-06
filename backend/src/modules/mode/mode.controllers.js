import asyncHandler from "../../middlewares/asyncHandler.js";
import { setModeService, getModeService, clearModeService } from "./mode.services.js";

/**
 * @desc    Set the operational mode via an httpOnly cookie
 * @route   POST /api/v1/mode/set
 * @access  Private
 * @body    { mode: "onsite" | "offsite", location?: { lat, lng } }
 */
export const setMode = asyncHandler(async (req, res) => {
  const { mode, location } = req.body;
  const data = await setModeService({
    res,
    mode,
    location,
    userId: req.user?._id,
    token: req.cookies.jwt,
  });
  return res.status(200).json({
    success: true,
    message: `Mode set to "${data.mode}" successfully`,
    data,
  });
});

/**
 * @desc    Get the current mode from the httpOnly cookie
 * @route   GET /api/v1/mode
 * @access  Private
 */
export const getMode = asyncHandler(async (req, res) => {
  const data = getModeService({ cookies: req.cookies });
  return res.status(200).json({ success: true, data });
});

/**
 * @desc    Clear the mode cookie
 * @route   DELETE /api/v1/mode
 * @access  Private
 */
export const clearMode = asyncHandler(async (req, res) => {
  clearModeService({ res });
  return res.status(200).json({
    success: true,
    message: "Mode cookie cleared successfully",
    data: { mode: null },
  });
});
