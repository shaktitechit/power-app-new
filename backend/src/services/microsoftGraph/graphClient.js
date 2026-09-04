import {
  MICROSOFT_GRAPH_AUTHORITY,
  MICROSOFT_GRAPH_BASE_URL,
  MICROSOFT_GRAPH_CLIENT_ID,
  MICROSOFT_GRAPH_CLIENT_SECRET,
  MICROSOFT_GRAPH_SCOPE,
  isMicrosoftGraphConfigured,
} from "../../config/microsoftGraph.js";
import logger from "../../config/logger.js";

let cachedToken = null;
let cachedTokenExpiresAt = 0;

function throwGraphError(message, statusCode = 502, details = null) {
  const err = new Error(message);
  err.statusCode = statusCode;
  if (details) err.details = details;
  throw err;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }
  }

  if (!response.ok) {
    const graphMessage =
      data?.error_description ||
      data?.error?.message ||
      data?.error ||
      `Microsoft Graph request failed (${response.status})`;
    const statusCode =
      response.status === 401 || response.status === 403 ? 502 : response.status;
    throwGraphError(String(graphMessage), statusCode >= 400 ? statusCode : 502, data);
  }

  return data;
}

export async function getGraphAccessToken() {
  if (!isMicrosoftGraphConfigured()) {
    throwGraphError("Microsoft Graph is not configured", 503);
  }

  const now = Date.now();
  if (cachedToken && now < cachedTokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const body = new URLSearchParams({
    client_id: MICROSOFT_GRAPH_CLIENT_ID,
    client_secret: MICROSOFT_GRAPH_CLIENT_SECRET,
    scope: MICROSOFT_GRAPH_SCOPE,
    grant_type: "client_credentials",
  });

  const data = await requestJson(`${MICROSOFT_GRAPH_AUTHORITY}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!data?.access_token) {
    throwGraphError("Microsoft Graph did not return an access token", 502);
  }

  const expiresInMs = Number(data.expires_in || 3600) * 1000;
  cachedToken = data.access_token;
  cachedTokenExpiresAt = now + expiresInMs;
  return cachedToken;
}

export async function graphRequest(pathname, { method = "GET", query, body } = {}) {
  const token = await getGraphAccessToken();
  const url = /^https?:\/\//i.test(pathname)
    ? new URL(pathname)
    : new URL(
        `${MICROSOFT_GRAPH_BASE_URL}${pathname.startsWith("/") ? pathname : `/${pathname}`}`,
      );

  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };

  const init = { method, headers };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    return await requestJson(url.toString(), init);
  } catch (error) {
    logger.warn("Microsoft Graph request failed", {
      method,
      path: pathname,
      statusCode: error.statusCode,
      errorMessage: error.message,
    });
    throw error;
  }
}
