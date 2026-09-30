import crypto from "crypto";
import { modelsRegistry } from "../data/modelRegistry.js";
const { ApiKey } = modelsRegistry;
import logger from "../config/logger.js";
import buildLogMeta from "../utils/buildLogMeta.js";
import asyncHandler from "./asyncHandler.js";

/**
 * Hash raw API key string using SHA-256 for secure lookup.
 * @param {string} rawKey
 * @returns {string}
 */
export function hashApiKey(rawKey) {
  return crypto.createHash("sha256").update(String(rawKey).trim()).digest("hex");
}

/**
 * Generate a new cryptographically secure API key pair.
 * @returns {{ rawKey: string, prefix: string, keyHash: string }}
 */
export function generateApiKeyPair() {
  const randomHex = crypto.randomBytes(24).toString("hex");
  const rawKey = `spl_live_${randomHex}`;
  const prefix = `${rawKey.slice(0, 13)}...${rawKey.slice(-4)}`;
  const keyHash = hashApiKey(rawKey);
  return { rawKey, prefix, keyHash };
}

/**
 * Extract API key token from headers or query.
 * Supported headers:
 * - `x-api-key: spl_live_...`
 * - `Authorization: Bearer spl_live_...` or `Authorization: ApiKey spl_live_...`
 * - Query param: `?api_key=spl_live_...`
 * @param {import("express").Request} req
 * @returns {string | null}
 */
export function extractApiKey(req) {
  const headerKey = req.headers["x-api-key"] || req.headers["X-API-KEY"] || req.headers["x-api_key"];
  if (headerKey && typeof headerKey === "string") {
    return headerKey.trim();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && typeof authHeader === "string") {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && (parts[0].toLowerCase() === "bearer" || parts[0].toLowerCase() === "apikey")) {
      const token = parts[1].trim();
      if (token.startsWith("spl_")) {
        return token;
      }
    }
  }

  if (req.query?.api_key && typeof req.query.api_key === "string") {
    return req.query.api_key.trim();
  }

  return null;
}

/**
 * Authentication middleware for external API consumers using API Key.
 */
export const apiKeyAuth = asyncHandler(async (req, res, next) => {
  const rawKey = extractApiKey(req);

  if (!rawKey) {
    logger.warn("External API Auth failed: missing API key", buildLogMeta(req));
    return res.status(401).json({
      success: false,
      message: "API key is required. Provide 'x-api-key' header or 'Authorization: Bearer <api_key>'.",
    });
  }

  const keyHash = hashApiKey(rawKey);
  const apiKeyRecord = await ApiKey.findOne({
    key_hash: keyHash,
    deleted_at: null,
  });

  if (!apiKeyRecord) {
    logger.warn("External API Auth failed: invalid API key", buildLogMeta(req));
    return res.status(401).json({
      success: false,
      message: "Invalid API key.",
    });
  }

  if (apiKeyRecord.status !== "active") {
    logger.warn(
      `External API Auth failed: API key status is '${apiKeyRecord.status}'`,
      buildLogMeta(req, { apiKeyId: apiKeyRecord._id }),
    );
    return res.status(403).json({
      success: false,
      message: `API key is inactive or has been revoked (${apiKeyRecord.status}).`,
    });
  }

  if (apiKeyRecord.expires_at && new Date(apiKeyRecord.expires_at) < new Date()) {
    logger.warn(
      "External API Auth failed: API key expired",
      buildLogMeta(req, { apiKeyId: apiKeyRecord._id }),
    );
    return res.status(403).json({
      success: false,
      message: "API key has expired.",
    });
  }

  // Update last_used_at timestamp without blocking the response
  ApiKey.updateOne({ _id: apiKeyRecord._id }, { $set: { last_used_at: new Date() } }).catch((err) => {
    logger.error("Failed to update API key last_used_at", { error: err.message });
  });

  req.apiKey = apiKeyRecord;
  req.isExternal = true;

  next();
});

/**
 * Middleware to enforce required scope(s) for the authenticated API key.
 * @param {string | string[]} requiredScopes
 */
export function requireApiKeyScope(requiredScopes) {
  const scopesToCheck = Array.isArray(requiredScopes) ? requiredScopes : [requiredScopes];

  return (req, res, next) => {
    if (!req.apiKey) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized: API key not authenticated.",
      });
    }

    const keyScopes = req.apiKey.scopes || [];
    const hasWildcard = keyScopes.includes("*");

    const hasPermission = scopesToCheck.some((requiredScope) => {
      if (hasWildcard) return true;
      if (keyScopes.includes(requiredScope)) return true;

      // Handle general "all:read" covering "enquiries:read", "facilities:read", etc.
      if (requiredScope.endsWith(":read") && keyScopes.includes("all:read")) return true;

      return false;
    });

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: API key lacks required scope [${scopesToCheck.join(", ")}].`,
      });
    }

    next();
  };
}
