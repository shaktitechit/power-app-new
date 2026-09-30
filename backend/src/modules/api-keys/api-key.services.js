import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";
const { ApiKey } = modelsRegistry;
import { generateApiKeyPair, hashApiKey } from "../../middlewares/apiKeyAuth.js";
import { API_KEY_SCOPES } from "../../models/apiKey.js";

/**
 * Create a new API Key.
 * Returns the raw key string ONLY once.
 */
export async function createApiKeyService({ user, body = {} }) {
  const { name, scopes, expires_at, description } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    const error = new Error("API key name is required");
    error.statusCode = 400;
    throw error;
  }

  let finalScopes = ["enquiries:read", "facilities:read"];
  if (Array.isArray(scopes) && scopes.length > 0) {
    const invalidScopes = scopes.filter((s) => !API_KEY_SCOPES.includes(s));
    if (invalidScopes.length > 0) {
      const error = new Error(`Invalid scopes: ${invalidScopes.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    finalScopes = scopes;
  }

  let parsedExpiresAt = null;
  if (expires_at) {
    const d = new Date(expires_at);
    if (Number.isNaN(d.getTime())) {
      const error = new Error("Invalid expires_at date format");
      error.statusCode = 400;
      throw error;
    }
    parsedExpiresAt = d;
  }

  const { rawKey, prefix, keyHash } = generateApiKeyPair();

  const apiKeyDoc = await ApiKey.create({
    name: name.trim(),
    prefix,
    key_hash: keyHash,
    scopes: finalScopes,
    status: "active",
    expires_at: parsedExpiresAt,
    created_by: user?._id || null,
    description: description ? String(description).trim() : "",
  });

  return {
    id: apiKeyDoc._id,
    name: apiKeyDoc.name,
    prefix: apiKeyDoc.prefix,
    apiKey: rawKey, // ⚠️ Only returned once during creation
    scopes: apiKeyDoc.scopes,
    status: apiKeyDoc.status,
    expires_at: apiKeyDoc.expires_at,
    created_at: apiKeyDoc.created_at,
    note: "Please save this API key securely. You will not be able to view the full key again.",
  };
}

/**
 * List all API keys for administrative view.
 */
export async function getApiKeysService() {
  const keys = await ApiKey.find({ deleted_at: null })
    .populate("created_by", "name email")
    .sort({ created_at: -1 })
    .lean();

  return keys.map((k) => ({
    id: k._id,
    name: k.name,
    prefix: k.prefix,
    scopes: k.scopes,
    status: k.status,
    expires_at: k.expires_at,
    last_used_at: k.last_used_at,
    description: k.description,
    created_by: k.created_by ? { id: k.created_by._id, name: k.created_by.name, email: k.created_by.email } : null,
    created_at: k.created_at,
    updated_at: k.updated_at,
  }));
}

/**
 * Revoke or change status of an API key.
 */
export async function updateApiKeyStatusService({ apiKeyId, status }) {
  if (!["active", "revoked", "inactive"].includes(status)) {
    const error = new Error("Invalid status. Must be 'active', 'revoked', or 'inactive'");
    error.statusCode = 400;
    throw error;
  }

  const apiKey = await ApiKey.findOne({ _id: apiKeyId, deleted_at: null });
  if (!apiKey) {
    const error = new Error("API key not found");
    error.statusCode = 404;
    throw error;
  }

  apiKey.status = status;
  await apiKey.save();

  return {
    id: apiKey._id,
    name: apiKey.name,
    prefix: apiKey.prefix,
    status: apiKey.status,
    updated_at: apiKey.updated_at,
  };
}

/**
 * Delete (soft delete) an API key.
 */
export async function deleteApiKeyService({ apiKeyId }) {
  const apiKey = await ApiKey.findOne({ _id: apiKeyId, deleted_at: null });
  if (!apiKey) {
    const error = new Error("API key not found");
    error.statusCode = 404;
    throw error;
  }

  await apiKey.softDelete();
  return { success: true, message: "API key deleted successfully" };
}
