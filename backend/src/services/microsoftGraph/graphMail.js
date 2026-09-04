import {
  MICROSOFT_GRAPH_MAILBOX,
  isMicrosoftGraphConfigured,
} from "../../config/microsoftGraph.js";
import { graphRequest } from "./graphClient.js";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toGraphBody(text, html) {
  if (html) {
    return {
      contentType: "HTML",
      content: html,
    };
  }
  const content = escapeHtml(text).replace(/\n/g, "<br>");
  return {
    contentType: "HTML",
    content: `<p>${content}</p>`,
  };
}

function mailboxPath(mailbox) {
  return `/users/${encodeURIComponent(mailbox)}`;
}

export function resolveGraphFromMailbox(senderEmail) {
  if (senderEmail) return senderEmail;
  return MICROSOFT_GRAPH_MAILBOX;
}

function toRecipientList(emails) {
  const list = Array.isArray(emails)
    ? emails
    : String(emails || "").split(/[,;]/);
  return list
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((address) => ({ emailAddress: { address } }));
}

export async function sendGraphMail({
  fromMailbox,
  toEmail,
  ccEmail,
  subject,
  body,
  html,
  attachments,
  saveToSentItems = true,
}) {
  if (!isMicrosoftGraphConfigured()) {
    return null;
  }
  const toRecipients = toRecipientList(toEmail);
  if (!toRecipients.length) {
    const err = new Error("Recipient email is required for Microsoft Graph mail");
    err.statusCode = 400;
    throw err;
  }

  const mailbox = fromMailbox || MICROSOFT_GRAPH_MAILBOX;
  const message = {
    subject: subject || "(no subject)",
    body: toGraphBody(body, html),
    toRecipients,
  };
  const ccRecipients = toRecipientList(ccEmail);
  if (ccRecipients.length) message.ccRecipients = ccRecipients;
  if (Array.isArray(attachments) && attachments.length) {
    message.attachments = attachments;
  }

  const created = await graphRequest(`${mailboxPath(mailbox)}/messages`, {
    method: "POST",
    body: message,
  });

  const graphMessageId = created?.id;
  if (graphMessageId) {
    await graphRequest(`${mailboxPath(mailbox)}/messages/${encodeURIComponent(graphMessageId)}/send`, {
      method: "POST",
    });
  } else {
    await graphRequest(`${mailboxPath(mailbox)}/sendMail`, {
      method: "POST",
      body: {
        message,
        saveToSentItems,
      },
    });
  }

  return {
    graph_message_id: graphMessageId || null,
    graph_conversation_id: created?.conversationId || null,
    mailbox,
  };
}

function senderFromGraphUser(user) {
  const email = String(user?.mail || user?.userPrincipalName || "").trim().toLowerCase();
  if (!email || !email.includes("@")) return null;
  return {
    name: String(user?.displayName || "").trim() || email,
    email,
  };
}

export async function listGraphMailSenders() {
  if (!isMicrosoftGraphConfigured()) {
    return [];
  }

  const senders = [];
  const seen = new Set();
  let pathname = "/users";
  let query = {
    $select: "displayName,mail,userPrincipalName,accountEnabled",
    $top: 999,
  };

  while (pathname) {
    const page = await graphRequest(pathname, query ? { query } : {});
    query = null;
    for (const user of page?.value || []) {
      if (user?.accountEnabled === false) continue;
      const sender = senderFromGraphUser(user);
      if (!sender || seen.has(sender.email)) continue;
      seen.add(sender.email);
      senders.push(sender);
    }
    pathname = page?.["@odata.nextLink"] || null;
  }

  const mailbox = String(MICROSOFT_GRAPH_MAILBOX || "").trim().toLowerCase();
  if (mailbox && mailbox.includes("@") && !seen.has(mailbox)) {
    senders.unshift({ name: mailbox, email: mailbox });
  }

  senders.sort((a, b) => a.email.localeCompare(b.email));
  return senders;
}

export async function listGraphInbox({ top = 50, skip = 0 } = {}) {
  if (!isMicrosoftGraphConfigured()) {
    const err = new Error("Microsoft Graph is not configured");
    err.statusCode = 503;
    throw err;
  }

  return graphRequest(`${mailboxPath(MICROSOFT_GRAPH_MAILBOX)}/mailFolders/inbox/messages`, {
    query: {
      $top: Math.min(Number(top) || 50, 100),
      $skip: Math.max(Number(skip) || 0, 0),
      $orderby: "receivedDateTime desc",
      $select:
        "id,subject,bodyPreview,body,from,toRecipients,ccRecipients,receivedDateTime,isRead,conversationId,internetMessageId",
    },
  });
}

export async function markGraphMessageRead(graphMessageId) {
  if (!isMicrosoftGraphConfigured() || !graphMessageId) return null;
  return graphRequest(
    `${mailboxPath(MICROSOFT_GRAPH_MAILBOX)}/messages/${encodeURIComponent(graphMessageId)}`,
    {
      method: "PATCH",
      body: { isRead: true },
    },
  );
}
