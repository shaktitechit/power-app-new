import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getDownloadPresignedUrl,
  getViewPresignedUrl,
} from "../../services/fileManagement/index.js";

// GET /api/v1/files/:fileId/view
export const redirectToViewUrl = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const url = await getViewPresignedUrl(fileId);
  return res.redirect(302, url);
});

// GET /api/v1/files/:fileId/download
export const redirectToDownloadUrl = asyncHandler(async (req, res) => {
  const { fileId } = req.params;
  const url = await getDownloadPresignedUrl(fileId);
  return res.redirect(302, url);
});
