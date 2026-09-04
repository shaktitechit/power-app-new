import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";
import { createRecentActivity } from "../../helpers/createRecentActivity.js";
import { buildActivityMessage } from "../../helpers/buildActivityMessage.js";
import {
  applyEnquiryVisibilityFilter,
  resolveAccessibleEnquiry,
  savePipelineAdvance,
} from "../enquiry/enquiry.services.js";
import {
  isMicrosoftGraphConfigured,
  MICROSOFT_GRAPH_MAILBOX,
} from "../../config/microsoftGraph.js";
import { sendGraphMail } from "../../services/microsoftGraph/graphMail.js";
import {
  buildBrandedEmailHtml,
  fileToGraphAttachment,
} from "../message/emailTemplate.js";

const { ExpressionOfInterest, Company, Enquiry, User } = modelsRegistry;

const DEFAULT_COMPANY_NAME = "Shakti Power Solutions Pvt. Ltd.";
const DEFAULT_SALUTATION = "Dear Sir,";
const DEFAULT_CLOSE = "Thanking you.\nYours faithfully,";
const DEFAULT_SIGNATORY_LABEL = "Authorized Signatory";

const EOI_STATUSES = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CANCELLED",
];

const STATUS_TRANSITIONS = {
  DRAFT: ["SENT", "CANCELLED"],
  SENT: ["ACCEPTED", "REJECTED", "EXPIRED", "CANCELLED", "DRAFT"],
  ACCEPTED: ["CANCELLED"],
  REJECTED: ["DRAFT", "CANCELLED"],
  EXPIRED: ["DRAFT", "CANCELLED"],
  CANCELLED: ["DRAFT"],
};

const LOCKED_STATUSES = new Set(["ACCEPTED", "REJECTED", "CANCELLED"]);

const SIGNATORY_ROLES = ["super_admin", "admin", "manager"];

const SIGNATORY_DESIGNATION = {
  super_admin: "Director",
  admin: "Admin",
  manager: "Manager",
};

const EOI_POPULATE = [
  { path: "createdBy", select: "name email role phone" },
  { path: "updatedBy", select: "name email role" },
  { path: "signatory.userId", select: "name email role phone" },
  { path: "enquiryId", select: "name city enquiry_number enquiry_status requested_audit_types client_representative" },
];

function throwError(message, statusCode = 400) {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
}

function toObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function parseMaybeJson(value) {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function joinAddressParts(...parts) {
  return parts
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");
}

function formatAuditAssignment(enquiry) {
  const types = Array.isArray(enquiry?.requested_audit_types)
    ? enquiry.requested_audit_types.filter(Boolean)
    : [];
  const assignment = types.length ? types.join(", ") : "Energy Audit";
  const location = String(enquiry?.city || enquiry?.name || "").trim();
  return { assignment, location };
}

function defaultSubject(enquiry) {
  const { assignment, location } = formatAuditAssignment(enquiry);
  if (location) {
    return `Submission of Expression of Interest (EOI) for Conducting ${assignment} at ${location}`;
  }
  return `Submission of Expression of Interest (EOI) for Conducting ${assignment}`;
}

function defaultBody(enquiry, companyName = DEFAULT_COMPANY_NAME) {
  const { assignment, location } = formatAuditAssignment(enquiry);
  const place = location ? ` at ${location}` : "";
  return [
    `With reference to our telephonic discussion, please find attached our Expression of Interest (EOI) along with the required documents for conducting the ${assignment}${place}.`,
    `${companyName} possesses the necessary technical expertise, qualified manpower, audit instruments, and relevant experience to successfully undertake the assignment.`,
    "We request you to kindly review the enclosed documents and let us know if any additional information or clarification is required.",
  ].join("\n\n");
}

async function findDefaultCompany() {
  return (
    (await Company.findOne({ is_default: true })) ||
    (await Company.findOne({}).sort({ created_at: 1 }))
  );
}

function snapshotCompany(company, override = {}) {
  const source = parseMaybeJson(override) || {};
  return {
    name:
      String(source.name || "").trim() ||
      String(company?.legal_name || "").trim() ||
      String(company?.trade_name || "").trim() ||
      DEFAULT_COMPANY_NAME,
    address:
      String(source.address || "").trim() ||
      joinAddressParts(
        company?.address,
        company?.city,
        company?.state,
        company?.pincode,
        company?.country,
      ),
    phone: String(source.phone || company?.phone || "").trim(),
    mobile: String(source.mobile || "").trim(),
    email: String(source.email || company?.email || "").trim(),
    website: String(source.website || company?.website || "").trim(),
  };
}

function snapshotRecipient(enquiry, override = {}) {
  const source = parseMaybeJson(override) || {};
  const organization =
    String(source.organization || "").trim() ||
    String(enquiry?.name || "").trim();
  const designation =
    String(source.designation || "").trim() ||
    String(enquiry?.client_representative || "").trim() ||
    "The Chief Executive Officer";
  const address =
    String(source.address || "").trim() ||
    joinAddressParts(enquiry?.address, enquiry?.city);

  if (!designation) throwError("Recipient designation is required");
  if (!organization) throwError("Recipient organization is required");

  const primaryRep = Array.isArray(enquiry?.client_representatives)
    ? enquiry.client_representatives[0]
    : null;

  return {
    designation,
    organization,
    address,
    email: String(source.email || enquiry?.client_email || primaryRep?.email || "").trim(),
    phone: String(
      source.phone || enquiry?.client_contact_number || primaryRep?.contact_number || "",
    ).trim(),
  };
}

function snapshotSignatory(user, company, override = {}) {
  const source = parseMaybeJson(override) || {};
  const name = String(source.name || user?.name || "").trim();
  if (!name) throwError("Signatory name is required");

  const role = String(user?.role || "").trim();
  const companyName =
    String(source.companyName || company?.legal_name || company?.trade_name || DEFAULT_COMPANY_NAME).trim();

  return {
    userId: source.userId || user?._id || null,
    label: String(source.label || DEFAULT_SIGNATORY_LABEL).trim() || DEFAULT_SIGNATORY_LABEL,
    name,
    designation:
      String(source.designation || SIGNATORY_DESIGNATION[role] || "Director").trim() || "Director",
    companyName,
    phone: String(source.phone || user?.phone || company?.phone || "").trim(),
    signature: String(source.signature || "").trim(),
  };
}

async function resolveSignatory(actingUser, company, override = {}) {
  const source = parseMaybeJson(override) || {};
  const requestedId = toObjectId(source.userId);
  let signatoryUser = actingUser;

  if (requestedId) {
    const found = await User.findById(requestedId).select("name email role status phone");
    if (!found) throwError("Signatory user not found", 404);
    if (!SIGNATORY_ROLES.includes(found.role)) {
      throwError("Signatory must be an admin, super admin, or manager");
    }
    if (found.status && found.status !== "active") {
      throwError("Signatory user is not active");
    }
    signatoryUser = found;
  } else if (!SIGNATORY_ROLES.includes(String(actingUser?.role || ""))) {
    throwError("Select a signatory (admin, super admin, or manager)");
  }

  return snapshotSignatory(signatoryUser, company, {
    ...source,
    userId: signatoryUser?._id,
    name: source.name || signatoryUser?.name,
    phone: source.phone || signatoryUser?.phone,
  });
}

export async function getEoiSignatoriesService() {
  return User.find({
    role: { $in: SIGNATORY_ROLES },
    status: { $ne: "inactive" },
  })
    .select("name email role phone")
    .sort({ name: 1 })
    .lean();
}

async function generateEoiRef(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dateStr = `${yyyy}${mm}${dd}`;
  const prefix = `EOI-SPL/${dateStr}/`;

  const latest = await ExpressionOfInterest.findOne({
    eoiRef: new RegExp(`^EOI-SPL\\/${dateStr}\\/`),
  })
    .sort({ eoiRef: -1 })
    .select("eoiRef")
    .exec();

  let nextSerial = 1;
  if (latest?.eoiRef) {
    const lastPart = latest.eoiRef.split("/").pop();
    const parsed = parseInt(lastPart, 10);
    if (!Number.isNaN(parsed)) nextSerial = parsed + 1;
  }

  return `${prefix}${String(nextSerial).padStart(3, "0")}`;
}

function parseStatus(value, fallback) {
  if (value == null || value === "") return fallback;
  const status = String(value).trim().toUpperCase();
  if (!EOI_STATUSES.includes(status)) {
    throwError(`Invalid status. Allowed: ${EOI_STATUSES.join(", ")}`);
  }
  return status;
}

function parseDate(value, fieldName) {
  if (value == null || value === "") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throwError(`Invalid ${fieldName}`);
  return date;
}

async function populateEoi(eoi) {
  if (!eoi) return null;
  return ExpressionOfInterest.populate(eoi, EOI_POPULATE);
}

async function logEoiActivity({ user, action, eoi, extraMessage }) {
  await createRecentActivity({
    actor: user,
    action,
    entity_type: "expression_of_interest",
    entity_id: eoi._id,
    entity_name: eoi.eoiRef,
    message:
      extraMessage ||
      buildActivityMessage({
        actorName: user?.name || "User",
        action,
        entityLabel: "expression of interest",
        entityName: eoi.eoiRef,
      }),
    meta: {
      enquiry_id: eoi.enquiryId || null,
      status: eoi.status,
    },
  });
}

async function assertEoiAccess(user, eoi) {
  if (!eoi) throwError("Expression of interest not found", 404);
  if (user?.role === "super_admin") return eoi;

  if (eoi.createdBy && String(eoi.createdBy) === String(user._id)) {
    return eoi;
  }

  const enquiryId = eoi.enquiryId;
  if (!enquiryId) {
    throwError("Expression of interest not found", 404);
  }

  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) throwError("Expression of interest not found", 404);
  return eoi;
}

async function accessibleEnquiryIds(user) {
  if (user?.role === "super_admin") return null;

  const query = {};
  applyEnquiryVisibilityFilter(query, user);
  return Enquiry.find(query).distinct("_id");
}

function enquiryRefId(value) {
  if (!value) return null;
  return typeof value === "object" ? value._id || null : value;
}

async function loadLinkedEnquiry(eoi) {
  const id = enquiryRefId(eoi?.enquiryId);
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;
  return Enquiry.findById(id);
}

async function advanceEnquiryIfEoiSent(enquiry, status) {
  if (!enquiry) return;
  if (status === "SENT" || status === "ACCEPTED") {
    await savePipelineAdvance(enquiry, "eoi_sent");
  }
}

async function markLinkedEnquiryEoiSent(eoi, status = "SENT") {
  const enquiry = await loadLinkedEnquiry(eoi);
  await advanceEnquiryIfEoiSent(enquiry, status);
}

export async function createEoiService({ user, body = {} }) {
  const enquiryId = body.enquiryId || body.leadId || null;
  let enquiry = null;

  if (enquiryId) {
    enquiry = await resolveAccessibleEnquiry(user, enquiryId);
    if (!enquiry) throwError("Enquiry not found", 404);
    const enquiryStatus = String(enquiry.enquiry_status || "").toLowerCase();
    if (["won", "lost", "dropped"].includes(enquiryStatus)) {
      throwError("Expressions of interest can only be created for enquiries that are still in the pipeline");
    }
  }

  const companyDoc = await findDefaultCompany();
  const company = snapshotCompany(companyDoc, body.company);
  const recipient = snapshotRecipient(enquiry, body.recipient);
  const signatory = await resolveSignatory(user, companyDoc, body.signatory);

  const eoiDate = parseDate(body.eoiDate, "eoiDate") || new Date();
  const status = parseStatus(body.status, "DRAFT");
  const subject = String(body.subject || "").trim() || defaultSubject(enquiry);
  const bodyText = String(body.body || "").trim() || defaultBody(enquiry, company.name);

  if (!subject) throwError("Subject is required");
  if (!bodyText) throwError("Letter body is required");

  const payload = {
    eoiRef: String(body.eoiRef || "").trim() || (await generateEoiRef(eoiDate)),
    eoiDate,
    subject,
    salutation: String(body.salutation || "").trim() || DEFAULT_SALUTATION,
    body: bodyText,
    complimentaryClose: String(body.complimentaryClose || "").trim() || DEFAULT_CLOSE,
    company,
    recipient,
    enquiryId: enquiry?._id || null,
    signatory,
    status,
    quotationId: toObjectId(body.quotationId),
    pdfUrl: String(body.pdfUrl || "").trim(),
    internalNotes: String(body.internalNotes || "").trim(),
    createdBy: user?._id || null,
    updatedBy: user?._id || null,
  };

  let eoi;
  try {
    eoi = await ExpressionOfInterest.create(payload);
  } catch (error) {
    if (error?.code === 11000) {
      payload.eoiRef = await generateEoiRef(eoiDate);
      eoi = await ExpressionOfInterest.create(payload);
    } else {
      throw error;
    }
  }

  await advanceEnquiryIfEoiSent(enquiry, status);
  await logEoiActivity({ user, action: "created", eoi });
  return populateEoi(eoi);
}

export async function getEoisService({ user, query = {} }) {
  const filter = {};

  if (query.enquiryId || query.leadId) {
    const enquiry = await resolveAccessibleEnquiry(user, query.enquiryId || query.leadId);
    if (!enquiry) throwError("Enquiry not found", 404);
    filter.enquiryId = enquiry._id;
  } else {
    const ids = await accessibleEnquiryIds(user);
    if (ids) {
      filter.$or = [{ enquiryId: { $in: ids } }, { createdBy: user._id }];
    }
  }

  if (query.status) {
    filter.status = parseStatus(query.status);
  }

  if (query.search) {
    const search = String(query.search).trim();
    if (search) {
      filter.$and = [
        ...(filter.$and || []),
        {
          $or: [
            { eoiRef: new RegExp(search, "i") },
            { subject: new RegExp(search, "i") },
            { "recipient.organization": new RegExp(search, "i") },
            { "recipient.designation": new RegExp(search, "i") },
            { body: new RegExp(search, "i") },
          ],
        },
      ];
    }
  }

  return ExpressionOfInterest.find(filter)
    .populate(EOI_POPULATE)
    .sort({ eoiDate: -1, created_at: -1 });
}

export async function getEoiByIdService({ user, eoiId }) {
  const id = toObjectId(eoiId);
  if (!id) throwError("Invalid expression of interest id");

  const eoi = await ExpressionOfInterest.findById(id);
  await assertEoiAccess(user, eoi);
  return populateEoi(eoi);
}

export async function updateEoiService({ user, eoiId, body = {} }) {
  const id = toObjectId(eoiId);
  if (!id) throwError("Invalid expression of interest id");

  const eoi = await ExpressionOfInterest.findById(id);
  await assertEoiAccess(user, eoi);

  if (LOCKED_STATUSES.has(eoi.status)) {
    throwError(`${eoi.status} expressions of interest cannot be edited`);
  }

  if (body.company) {
    eoi.company = snapshotCompany(null, {
      ...eoi.company.toObject?.() || eoi.company,
      ...parseMaybeJson(body.company),
    });
  }

  if (body.recipient) {
    eoi.recipient = snapshotRecipient(null, {
      ...eoi.recipient.toObject?.() || eoi.recipient,
      ...parseMaybeJson(body.recipient),
    });
  }

  if (body.signatory) {
    eoi.signatory = await resolveSignatory(user, null, {
      ...eoi.signatory.toObject?.() || eoi.signatory,
      ...parseMaybeJson(body.signatory),
    });
  }

  if (body.subject !== undefined) {
    const subject = String(body.subject || "").trim();
    if (!subject) throwError("Subject is required");
    eoi.subject = subject;
  }

  if (body.body !== undefined) {
    const letterBody = String(body.body || "").trim();
    if (!letterBody) throwError("Letter body is required");
    eoi.body = letterBody;
  }

  if (body.salutation !== undefined) {
    eoi.salutation = String(body.salutation || "").trim() || DEFAULT_SALUTATION;
  }
  if (body.complimentaryClose !== undefined) {
    eoi.complimentaryClose = String(body.complimentaryClose || "").trim() || DEFAULT_CLOSE;
  }
  if (body.internalNotes !== undefined) eoi.internalNotes = String(body.internalNotes || "").trim();
  if (body.pdfUrl !== undefined) eoi.pdfUrl = String(body.pdfUrl || "").trim();
  if (body.quotationId !== undefined) eoi.quotationId = toObjectId(body.quotationId);
  if (body.eoiDate !== undefined) eoi.eoiDate = parseDate(body.eoiDate, "eoiDate");

  if (body.status !== undefined) {
    const nextStatus = parseStatus(body.status);
    if (nextStatus !== eoi.status) {
      const allowed = STATUS_TRANSITIONS[eoi.status] || [];
      if (!allowed.includes(nextStatus)) {
        throwError(`Cannot change status from ${eoi.status} to ${nextStatus}`);
      }
      eoi.status = nextStatus;
    }
  }

  eoi.updatedBy = user?._id || eoi.updatedBy;
  await eoi.save();

  if (eoi.status === "SENT" || eoi.status === "ACCEPTED") {
    await markLinkedEnquiryEoiSent(eoi, eoi.status);
  }

  await logEoiActivity({ user, action: "updated", eoi });
  return populateEoi(eoi);
}

export async function updateEoiStatusService({ user, eoiId, body = {} }) {
  const id = toObjectId(eoiId);
  if (!id) throwError("Invalid expression of interest id");

  const eoi = await ExpressionOfInterest.findById(id);
  await assertEoiAccess(user, eoi);

  const nextStatus = parseStatus(body.status);
  if (nextStatus === eoi.status) {
    return populateEoi(eoi);
  }

  const allowed = STATUS_TRANSITIONS[eoi.status] || [];
  if (!allowed.includes(nextStatus)) {
    throwError(`Cannot change status from ${eoi.status} to ${nextStatus}`);
  }

  const previousStatus = eoi.status;
  eoi.status = nextStatus;
  eoi.updatedBy = user?._id || eoi.updatedBy;
  await eoi.save();

  if (nextStatus === "SENT" || nextStatus === "ACCEPTED") {
    await markLinkedEnquiryEoiSent(eoi, nextStatus);
  }

  await logEoiActivity({
    user,
    action: "status_changed",
    eoi,
    extraMessage: `${user?.name || "User"} changed expression of interest "${eoi.eoiRef}" from ${previousStatus} to ${nextStatus}`,
  });

  return populateEoi(eoi);
}

export async function acceptEoiService({ user, eoiId }) {
  return updateEoiStatusService({
    user,
    eoiId,
    body: { status: "ACCEPTED" },
  });
}

function parseEmailList(value) {
  return String(value || "")
    .split(/[,;]/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function sendEoiEmailService({ user, eoiId, body = {}, file }) {
  if (!isMicrosoftGraphConfigured()) {
    throwError("Microsoft Graph is not configured", 503);
  }

  const id = toObjectId(eoiId);
  if (!id) throwError("Invalid expression of interest id");

  const eoi = await ExpressionOfInterest.findById(id);
  await assertEoiAccess(user, eoi);

  const canMarkSent = (STATUS_TRANSITIONS[eoi.status] || []).includes("SENT");
  const canResend = eoi.status === "SENT" || eoi.status === "ACCEPTED";
  if (!canMarkSent && !canResend) {
    throwError(`Cannot email an expression of interest in ${eoi.status} status`);
  }

  const toEmails = parseEmailList(body.to || eoi.recipient?.email);
  const ccEmails = parseEmailList(body.cc);
  if (!toEmails.length) throwError("Recipient email is required");
  if (toEmails.some((email) => !isValidEmail(email))) throwError("Enter a valid recipient email");
  if (ccEmails.some((email) => !isValidEmail(email))) throwError("Enter a valid CC email");

  const senderEmail =
    parseEmailList(body.from)[0] ||
    String(user?.email || "").trim().toLowerCase() ||
    String(MICROSOFT_GRAPH_MAILBOX || "").trim().toLowerCase() ||
    null;
  if (!senderEmail || !isValidEmail(senderEmail)) {
    throwError("Enter a valid from email");
  }

  const mailSubject = String(body.subject || "").trim() || eoi.subject;
  const mailBody = String(body.body || body.message || "").trim() || eoi.body;
  const recipientName = String(
    body.recipientName || eoi.recipient?.designation || eoi.recipient?.organization || "",
  ).trim();

  const branded = await buildBrandedEmailHtml({
    senderName: user?.name,
    senderEmail,
    recipientName,
    subject: mailSubject,
    message: mailBody,
  });

  const attachments = [];
  if (branded.logoAttachment) attachments.push(branded.logoAttachment);
  const pdfAttachment = fileToGraphAttachment(
    file,
    `${eoi.eoiRef || "eoi"}.pdf`,
  );
  if (pdfAttachment) attachments.push(pdfAttachment);

  await sendGraphMail({
    fromMailbox: senderEmail,
    toEmail: toEmails,
    ccEmail: ccEmails,
    subject: mailSubject,
    body: mailBody,
    html: branded.html,
    attachments: attachments.length ? attachments : undefined,
  });

  if (canMarkSent) {
    return updateEoiStatusService({
      user,
      eoiId,
      body: { status: "SENT" },
    });
  }

  eoi.updatedBy = user?._id || eoi.updatedBy;
  await eoi.save();
  await markLinkedEnquiryEoiSent(eoi, "SENT");
  await logEoiActivity({
    user,
    action: "updated",
    eoi,
    extraMessage: `${user?.name || "User"} resent expression of interest "${eoi.eoiRef}" to ${toEmails.join(", ")}`,
  });
  return populateEoi(eoi);
}

export async function deleteEoiService({ user, eoiId }) {
  if (user?.role !== "super_admin") {
    throwError("Only super administrators can delete expressions of interest", 403);
  }

  const id = toObjectId(eoiId);
  if (!id) throwError("Invalid expression of interest id");

  const eoi = await ExpressionOfInterest.findById(id);
  await assertEoiAccess(user, eoi);

  await eoi.softDelete();
  await logEoiActivity({ user, action: "deleted", eoi });
}
