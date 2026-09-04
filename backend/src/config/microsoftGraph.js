import dotenv from "dotenv";

dotenv.config();

function trimEnv(value) {
  return String(value || "").trim();
}

/**
 * Azure AD tenant. Accepts `MICROSOFT_GRAPH_TENANT_ID` or the standard `AZURE_TENANT_ID`.
 */
export const MICROSOFT_GRAPH_TENANT_ID =
  trimEnv(process.env.MICROSOFT_GRAPH_TENANT_ID) ||
  trimEnv(process.env.AZURE_TENANT_ID);

/**
 * App registration client id. Accepts `MICROSOFT_GRAPH_CLIENT_ID` or `AZURE_CLIENT_ID`.
 */
export const MICROSOFT_GRAPH_CLIENT_ID =
  trimEnv(process.env.MICROSOFT_GRAPH_CLIENT_ID) ||
  trimEnv(process.env.AZURE_CLIENT_ID);

/**
 * App registration client secret. Accepts `MICROSOFT_GRAPH_CLIENT_SECRET` or `AZURE_CLIENT_SECRET`.
 */
export const MICROSOFT_GRAPH_CLIENT_SECRET =
  trimEnv(process.env.MICROSOFT_GRAPH_CLIENT_SECRET) ||
  trimEnv(process.env.AZURE_CLIENT_SECRET);

/**
 * Mailbox Graph sends/reads as (UPN or object id). Required for application permissions.
 * Accepts MICROSOFT_GRAPH_MAILBOX, GRAPH_MAILBOX, or MICROSOFT_GRAPH_SENDER_EMAIL.
 */
export const MICROSOFT_GRAPH_MAILBOX =
  trimEnv(process.env.MICROSOFT_GRAPH_MAILBOX) ||
  trimEnv(process.env.GRAPH_MAILBOX) ||
  trimEnv(process.env.MICROSOFT_GRAPH_SENDER_EMAIL);

export const MICROSOFT_GRAPH_SCOPE =
  trimEnv(process.env.MICROSOFT_GRAPH_SCOPE) ||
  "https://graph.microsoft.com/.default";

export const MICROSOFT_GRAPH_BASE_URL =
  trimEnv(process.env.MICROSOFT_GRAPH_BASE_URL) ||
  "https://graph.microsoft.com/v1.0";

export const MICROSOFT_GRAPH_AUTHORITY =
  trimEnv(process.env.MICROSOFT_GRAPH_AUTHORITY) ||
  (MICROSOFT_GRAPH_TENANT_ID
    ? `https://login.microsoftonline.com/${MICROSOFT_GRAPH_TENANT_ID}`
    : "");

/**
 * `user` = send as the chosen From address (any mailbox in the tenant).
 * `mailbox` is kept as the fallback sender when From is empty.
 */
export const MICROSOFT_GRAPH_FROM_MODE = (
  trimEnv(process.env.MICROSOFT_GRAPH_FROM_MODE) || "user"
).toLowerCase();

export function isMicrosoftGraphConfigured() {
  return Boolean(
    MICROSOFT_GRAPH_TENANT_ID &&
      MICROSOFT_GRAPH_CLIENT_ID &&
      MICROSOFT_GRAPH_CLIENT_SECRET &&
      MICROSOFT_GRAPH_MAILBOX,
  );
}

export function assertMicrosoftGraphConfig() {
  if (!isMicrosoftGraphConfigured()) {
    console.warn(
      "[microsoft-graph] Missing AZURE_/MICROSOFT_GRAPH_ tenant, client, secret, or mailbox — Graph mail is disabled.",
    );
  }
}
