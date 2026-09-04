import { modelsRegistry } from "../data/modelRegistry.js";
import { createNotification } from "../services/notificationService.js";
import {
  isMicrosoftGraphConfigured,
  MICROSOFT_GRAPH_SENDER_EMAIL,
} from "../config/microsoftGraph.js";
import { sendGraphMail } from "../services/microsoftGraph/graphMail.js";
import { buildBrandedEmailHtml } from "../modules/message/emailTemplate.js";
import { createdByUserId, signatoryUserId } from "./signatoryApproval.js";

const { User } = modelsRegistry;

function frontendBaseUrl() {
  return (
    String(process.env.FRONTEND_URL || "")
      .split(",")[0]
      .trim()
      .replace(/\/$/, "") || "http://localhost:3000"
  );
}

function documentKindMeta(kind) {
  if (kind === "eoi") {
    return {
      kind,
      noun: "expression of interest",
      shortLabel: "EOI",
      pathPrefix: "/eois",
    };
  }
  return {
    kind: "quotation",
    noun: "quotation",
    shortLabel: "Quotation",
    pathPrefix: "/quotations",
  };
}

function documentRef(kind, doc) {
  return kind === "eoi" ? doc?.eoiRef : doc?.quotationRef;
}

function documentUrl(kind, doc) {
  const meta = documentKindMeta(kind);
  if (!doc?._id) return frontendBaseUrl();
  return `${frontendBaseUrl()}${meta.pathPrefix}/${doc._id}`;
}

function sameId(left, right) {
  return Boolean(left) && Boolean(right) && String(left) === String(right);
}

async function loadUser(id) {
  if (!id) return null;
  return User.findById(id).select("name email").lean();
}

async function notifyInApp(io, payload) {
  try {
    await createNotification(io, payload);
  } catch (error) {
    console.error("[signatory-notify] Failed to create in-app notification:", error);
  }
}

async function sendLifecycleEmail({ toUser, subject, message }) {
  const toEmail = String(toUser?.email || "").trim().toLowerCase();
  const fromMailbox = String(MICROSOFT_GRAPH_SENDER_EMAIL || "").trim();
  if (!toEmail || !toEmail.includes("@")) return;
  if (!isMicrosoftGraphConfigured() || !fromMailbox) return;

  try {
    const branded = await buildBrandedEmailHtml({
      senderName: "Shakti Power Solutions",
      senderEmail: fromMailbox,
      recipientName: toUser?.name || "",
      subject,
      message,
    });
    const attachments = branded.logoAttachment ? [branded.logoAttachment] : undefined;
    await sendGraphMail({
      fromMailbox,
      toEmail,
      subject,
      body: message,
      html: branded.html,
      attachments,
    });
  } catch (error) {
    console.error("[signatory-notify] Failed to send email:", error);
  }
}

export async function notifySignatoryOnCreate({ io, actor, doc, kind }) {
  const signatoryId = signatoryUserId(doc);
  if (!signatoryId || sameId(signatoryId, actor?._id)) return;

  const signatory = await loadUser(signatoryId);
  if (!signatory) return;

  const meta = documentKindMeta(kind);
  const ref = documentRef(kind, doc) || meta.shortLabel;
  const creatorName = actor?.name || "A colleague";
  const url = documentUrl(kind, doc);
  const title = `${meta.shortLabel} awaiting your approval`;
  const message = `${creatorName} created ${meta.noun} ${ref} and assigned you as signatory. Please review and approve it.\n\nOpen: ${url}`;

  await notifyInApp(io, {
    recipient: signatory._id,
    sender: actor?._id || null,
    title,
    message: `${creatorName} created ${meta.noun} ${ref} and assigned you as signatory.`,
    type: "system",
    referenceId: doc._id,
  });

  await sendLifecycleEmail({
    toUser: signatory,
    subject: title,
    message,
  });
}

export async function notifyCreatorOnApproval({ io, actor, doc, kind }) {
  const creatorId = createdByUserId(doc);
  if (!creatorId || sameId(creatorId, actor?._id)) return;

  const creator = await loadUser(creatorId);
  if (!creator) return;

  const meta = documentKindMeta(kind);
  const ref = documentRef(kind, doc) || meta.shortLabel;
  const signatoryName = actor?.name || "The assigned signatory";
  const url = documentUrl(kind, doc);
  const title = `${meta.shortLabel} ${ref} approved`;
  const message = `${signatoryName} approved ${meta.noun} ${ref}. You can now send it.\n\nOpen: ${url}`;

  await notifyInApp(io, {
    recipient: creator._id,
    sender: actor?._id || null,
    title,
    message: `${signatoryName} approved ${meta.noun} ${ref}.`,
    type: "system",
    referenceId: doc._id,
  });

  await sendLifecycleEmail({
    toUser: creator,
    subject: title,
    message,
  });
}
