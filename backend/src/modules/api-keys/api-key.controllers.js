import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createApiKeyService,
  getApiKeysService,
  updateApiKeyStatusService,
  deleteApiKeyService,
} from "./api-key.services.js";

/**
 * POST /api/v1/admin/api-keys
 */
export const createApiKey = asyncHandler(async (req, res) => {
  const result = await createApiKeyService({ user: req.user, body: req.body });
  return res.status(201).json({
    success: true,
    message: "API key generated successfully",
    data: result,
  });
});

/**
 * GET /api/v1/admin/api-keys
 */
export const getApiKeys = asyncHandler(async (req, res) => {
  const data = await getApiKeysService();
  return res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

/**
 * PATCH /api/v1/admin/api-keys/:id/status
 */
export const updateApiKeyStatus = asyncHandler(async (req, res) => {
  const result = await updateApiKeyStatusService({
    apiKeyId: req.params.id,
    status: req.body.status,
  });
  return res.status(200).json({
    success: true,
    message: `API key status updated to '${req.body.status}'`,
    data: result,
  });
});

/**
 * DELETE /api/v1/admin/api-keys/:id
 */
export const deleteApiKey = asyncHandler(async (req, res) => {
  await deleteApiKeyService({ apiKeyId: req.params.id });
  return res.status(200).json({
    success: true,
    message: "API key deleted successfully",
  });
});
