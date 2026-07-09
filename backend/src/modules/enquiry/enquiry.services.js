import { modelsRegistry } from "../../data/modelRegistry.js";
const { Enquiry, FollowUp, EnquiryDocument, Facility } = modelsRegistry;
import crypto from "crypto";
import mongoose from "mongoose";
import { uploadAuditDocuments } from "../shared/electrical-audit.helpers.js";




import { createRecentActivity } from "../../helpers/createRecentActivity.js";
import { buildActivityMessage } from "../../helpers/buildActivityMessage.js";
import { isAdmin } from "../../services/authorization/index.js";
import { createNotification } from "../../services/notificationService.js";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ENQUIRY_STATUSES = [
  "new",
  "contacted",
  "in_discussion",
  "quoted",
  "negotiation",
  "won",
  "lost",
  "dropped",
];


export const AUDIT_TYPES = [
  "Electrical Energy Audit",
  "Electrical Safety Audit",
  "Thermal Audit",
  "Lightning Arrester Audit",
];

// ─── Private helpers ──────────────────────────────────────────────────────────

export function parseClientRepresentatives(client_representatives) {
  if (!client_representatives) return [];
  let parsed = [];
  if (Array.isArray(client_representatives)) {
    parsed = client_representatives;
  } else {
    try {
      parsed = JSON.parse(client_representatives);
    } catch {
      parsed = [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((rep) => ({
      name: String(rep?.name || "").trim(),
      contact_number: String(rep?.contact_number || "").trim(),
      email: String(rep?.email || "").trim(),
    }))
    .filter((rep) => rep.name || rep.contact_number || rep.email);
}

async function generateUniqueEnquiryDocumentNumber() {
  const maxAttempts = 12;
  for (let i = 0; i < maxAttempts; i++) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
    const candidate = `DOC-${ymd}-${rand}`;
    const taken = await EnquiryDocument.findOne({ document_number: candidate, deleted_at: null })
      .select("_id")
      .lean();
    if (!taken) return candidate;
  }
  return `DOC-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

export function parseRequestedAuditTypes(value) {
  if (value == null) return undefined;
  let arr = value;
  if (typeof value === "string") {
    try { arr = JSON.parse(value); } catch { arr = [value]; }
  }
  if (!Array.isArray(arr)) return undefined;
  return arr.filter((t) => AUDIT_TYPES.includes(t));
}

export function parseOptionalObjectId(value) {
  if (value == null || value === "") return null;
  if (!mongoose.Types.ObjectId.isValid(value)) return undefined;
  return new mongoose.Types.ObjectId(value);
}

export function displayEnquiryName(enquiry) {
  return enquiry?.name?.trim() || "Enquiry";
}

export function buildEnquiryPopulate() {
  return [
    { path: "assigned_to", select: "name email role" },
    { path: "assigned_admin_to", select: "name email role" },
    { path: "created_by", select: "name email role" },
    { path: "converted_facility_id", select: "name city status" },
  ];
}

/**
 * Resolve an enquiry the user is allowed to access.
 * Admin/super_admin → any enquiry.
 * Others → only their created or assigned enquiries.
 */
export async function resolveAccessibleEnquiry(user, enquiryId) {
  if (!user?._id || !enquiryId) return null;
  if (!mongoose.Types.ObjectId.isValid(enquiryId)) return null;

  const enquiry = await Enquiry.findById(enquiryId);
  if (!enquiry) return null;
  if (user?.role === "admin") {
    if (enquiry.assigned_admin_to?.toString() === user._id.toString()) return enquiry;
    return null;
  }
  if (isAdmin(user)) return enquiry;

  const uid = user._id.toString();
  if (enquiry.created_by?.toString() === uid) return enquiry;
  if (enquiry.assigned_to?.toString() === uid) return enquiry;

  return null;
}

// ─── Enquiry services ─────────────────────────────────────────────────────────

export async function createEnquiryService({ user, body, io }) {
  const {
    name, city, address,
    client_representative, client_contact_number, client_email,
    client_representatives,
    assigned_to: assignedRaw,
    assigned_admin_to: assignedAdminRaw,
    enquiry_status, source, expected_value,
    requested_audit_types, notes, next_followup_date,
  } = body;

  if (!name || !city) {
    const err = new Error("Name and city are required");
    err.statusCode = 400;
    throw err;
  }

  const parsedClientReps = parseClientRepresentatives(client_representatives);
  const fallbackClientReps =
    parsedClientReps.length > 0
      ? parsedClientReps
      : client_representative || client_contact_number || client_email
        ? [{ name: String(client_representative || "").trim(), contact_number: String(client_contact_number || "").trim(), email: String(client_email || "").trim() }]
        : [];

  const assigned_to = parseOptionalObjectId(assignedRaw);
  if (assignedRaw && assigned_to === undefined) {
    const err = new Error("Invalid assigned_to");
    err.statusCode = 400;
    throw err;
  }

  const assigned_admin_to = parseOptionalObjectId(assignedAdminRaw);
  if (assignedAdminRaw && assigned_admin_to === undefined) {
    const err = new Error("Invalid assigned_admin_to");
    err.statusCode = 400;
    throw err;
  }

  if (enquiry_status != null && !ENQUIRY_STATUSES.includes(String(enquiry_status))) {
    const err = new Error("Invalid enquiry_status");
    err.statusCode = 400;
    throw err;
  }

  const auditTypes = parseRequestedAuditTypes(requested_audit_types);

  let nextFollowup = undefined;
  if (next_followup_date) {
    const d = new Date(next_followup_date);
    if (Number.isNaN(d.getTime())) {
      const err = new Error("Invalid next_followup_date");
      err.statusCode = 400;
      throw err;
    }
    nextFollowup = d;
  }

  const enquiry = await Enquiry.create({
    name: String(name).trim(),
    city: String(city).trim(),
    address: address != null ? String(address).trim() : undefined,
    client_representative: client_representative != null ? String(client_representative).trim() : undefined,
    client_contact_number,
    client_email,
    client_representatives: fallbackClientReps,
    assigned_to: assigned_to || undefined,
    assigned_admin_to: assigned_admin_to || undefined,
    enquiry_status: enquiry_status || "new",
    source: source != null ? String(source).trim() : undefined,
    expected_value: expected_value !== undefined && expected_value !== "" ? Number(expected_value) : undefined,
    requested_audit_types: auditTypes ?? [],
    notes: notes != null ? String(notes).trim() : undefined,
    next_followup_date: nextFollowup,
    created_by: user._id,
  });

  await enquiry.populate(buildEnquiryPopulate());

  if (enquiry.assigned_to) {
    await createNotification(io, {
      recipient: enquiry.assigned_to._id,
      sender: user._id,
      title: "New Enquiry Assigned",
      message: `You have been assigned to enquiry: ${displayEnquiryName(enquiry)}`,
      type: "enquiry",
      referenceId: enquiry._id,
    });
  }

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "enquiry",
    entity_id: enquiry._id,
    entity_name: displayEnquiryName(enquiry),
    message: buildActivityMessage({ actorName: user?.name || "User", action: "created", entityLabel: "enquiry", entityName: displayEnquiryName(enquiry) }),
    meta: { city: enquiry.city, enquiry_status: enquiry.enquiry_status },
  });

  return enquiry;
}

export async function getEnquiriesService({ user, query: rawQuery }) {
  const query = {};

  if (rawQuery.enquiry_status) {
    if (!ENQUIRY_STATUSES.includes(String(rawQuery.enquiry_status))) {
      const err = new Error("Invalid enquiry_status filter");
      err.statusCode = 400;
      throw err;
    }
    query.enquiry_status = rawQuery.enquiry_status;
  }

  if (rawQuery.city) {
    query.city = new RegExp(String(rawQuery.city).trim(), "i");
  }

  if (rawQuery.assigned_to) {
    const aid = parseOptionalObjectId(rawQuery.assigned_to);
    if (!aid) {
      const err = new Error("Invalid assigned_to filter");
      err.statusCode = 400;
      throw err;
    }
    query.assigned_to = aid;
  }

  if (user?.role === "admin") {
    query.assigned_admin_to = user._id;
  } else if (!isAdmin(user)) {
    query.$or = [{ created_by: user._id }, { assigned_to: user._id }];
  }

  return Enquiry.find(query).populate(buildEnquiryPopulate()).sort({ created_at: -1 });
}

export async function getEnquiryByIdService({ user, enquiryId }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }
  await enquiry.populate(buildEnquiryPopulate());
  return enquiry;
}

export async function updateEnquiryService({ user, enquiryId, body, io }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }

  const {
    name, city, address,
    client_representative, client_contact_number, client_email,
    client_representatives,
    assigned_to: assignedRaw,
    assigned_admin_to: assignedAdminRaw,
    enquiry_status, source, expected_value,
    requested_audit_types, notes, next_followup_date,
    is_converted_to_facility,
    converted_facility_id: convertedFacilityRaw,
  } = body;

  const updatedFields = Object.keys(body || {});

  if (name !== undefined) enquiry.name = String(name).trim();
  if (city !== undefined) enquiry.city = String(city).trim();
  if (address !== undefined) enquiry.address = String(address).trim();
  if (client_representative !== undefined) enquiry.client_representative = client_representative ? String(client_representative).trim() : "";
  if (client_contact_number !== undefined) enquiry.client_contact_number = client_contact_number;
  if (client_email !== undefined) enquiry.client_email = client_email;
  if (client_representatives !== undefined) enquiry.client_representatives = parseClientRepresentatives(client_representatives);

  if (assignedRaw !== undefined) {
    if (assignedRaw === null || assignedRaw === "") {
      enquiry.assigned_to = undefined;
    } else {
      const aid = parseOptionalObjectId(assignedRaw);
      if (!aid) {
        const err = new Error("Invalid assigned_to");
        err.statusCode = 400;
        throw err;
      }
      enquiry.assigned_to = aid;
    }
  }

  if (assignedAdminRaw !== undefined) {
    if (assignedAdminRaw === null || assignedAdminRaw === "") {
      enquiry.assigned_admin_to = undefined;
    } else {
      const aid = parseOptionalObjectId(assignedAdminRaw);
      if (!aid) {
        const err = new Error("Invalid assigned_admin_to");
        err.statusCode = 400;
        throw err;
      }
      enquiry.assigned_admin_to = aid;
    }
  }

  if (enquiry_status !== undefined) {
    if (!ENQUIRY_STATUSES.includes(String(enquiry_status))) {
      const err = new Error("Invalid enquiry_status");
      err.statusCode = 400;
      throw err;
    }
    enquiry.enquiry_status = enquiry_status;
  }

  if (source !== undefined) enquiry.source = source ? String(source).trim() : "";
  if (expected_value !== undefined) {
    enquiry.expected_value = expected_value === "" || expected_value == null ? undefined : Number(expected_value);
  }
  if (requested_audit_types !== undefined) {
    enquiry.requested_audit_types = parseRequestedAuditTypes(requested_audit_types) ?? [];
  }
  if (notes !== undefined) enquiry.notes = notes ? String(notes).trim() : "";

  if (next_followup_date !== undefined) {
    if (next_followup_date === null || next_followup_date === "") {
      enquiry.next_followup_date = undefined;
    } else {
      const d = new Date(next_followup_date);
      if (Number.isNaN(d.getTime())) {
        const err = new Error("Invalid next_followup_date");
        err.statusCode = 400;
        throw err;
      }
      enquiry.next_followup_date = d;
    }
  }

  if (is_converted_to_facility !== undefined) enquiry.is_converted_to_facility = Boolean(is_converted_to_facility);

  if (convertedFacilityRaw !== undefined) {
    if (convertedFacilityRaw === null || convertedFacilityRaw === "") {
      enquiry.converted_facility_id = undefined;
    } else {
      const fid = parseOptionalObjectId(convertedFacilityRaw);
      if (!fid) {
        const err = new Error("Invalid converted_facility_id");
        err.statusCode = 400;
        throw err;
      }
      const facilityExists = await Facility.exists({ _id: fid });
      if (!facilityExists) {
        const err = new Error("Facility not found");
        err.statusCode = 400;
        throw err;
      }
      enquiry.converted_facility_id = fid;
    }
  }

  const updated = await enquiry.save();
  await updated.populate(buildEnquiryPopulate());

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "enquiry",
    entity_id: updated._id,
    entity_name: displayEnquiryName(updated),
    message: buildActivityMessage({ actorName: user?.name || "User", action: "updated", entityLabel: "enquiry", entityName: displayEnquiryName(updated) }),
    meta: { updated_fields: [...new Set(updatedFields)], enquiry_status: updated.enquiry_status },
  });

  if (assignedRaw !== undefined && updated.assigned_to) {
    await createNotification(io, {
      recipient: updated.assigned_to._id,
      sender: user._id,
      title: "New Enquiry Assigned",
      message: `You have been assigned to enquiry: ${displayEnquiryName(updated)}`,
      type: "enquiry",
      referenceId: updated._id,
    });
  }

  if (enquiry_status !== undefined) {
    const recipientId = updated.assigned_to?._id || updated.created_by?._id;
    if (recipientId) {
      await createNotification(io, {
        recipient: recipientId,
        sender: user._id,
        title: "Enquiry Status Updated",
        message: `Enquiry ${displayEnquiryName(updated)} status changed to ${updated.enquiry_status}`,
        type: "enquiry",
        referenceId: updated._id,
      });
    }
  }

  return updated;
}

export async function deleteEnquiryService({ user, enquiryId }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }

  const name = displayEnquiryName(enquiry);
  await FollowUp.softDeleteMany({ enquiry_id: enquiry._id });
  await EnquiryDocument.softDeleteMany({ enquiry_id: enquiry._id });
  await enquiry.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "enquiry",
    entity_id: enquiry._id,
    entity_name: name,
    message: buildActivityMessage({ actorName: user?.name || "User", action: "deleted", entityLabel: "enquiry", entityName: name }),
  });
}

// ─── Follow-up services ───────────────────────────────────────────────────────

export async function getFollowUpsService({ user, enquiryId }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }
  return FollowUp.find({ enquiry_id: enquiry._id })
    .populate("created_by", "name email role")
    .sort({ createdAt: -1 });
}

export async function createFollowUpService({ user, enquiryId, body }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }

  const { followup_date, mode, remarks, outcome, next_followup_date } = body;

  if (!followup_date) {
    const err = new Error("followup_date is required");
    err.statusCode = 400;
    throw err;
  }
  const fd = new Date(followup_date);
  if (Number.isNaN(fd.getTime())) {
    const err = new Error("Invalid followup_date");
    err.statusCode = 400;
    throw err;
  }

  let nextFd = undefined;
  if (next_followup_date) {
    const nd = new Date(next_followup_date);
    if (Number.isNaN(nd.getTime())) {
      const err = new Error("Invalid next_followup_date");
      err.statusCode = 400;
      throw err;
    }
    nextFd = nd;
  }

  const row = await FollowUp.create({
    enquiry_id: enquiry._id,
    followup_date: fd,
    mode,
    remarks: remarks != null ? String(remarks).trim() : undefined,
    outcome,
    next_followup_date: nextFd,
    created_by: user._id,
  });
  await row.populate("created_by", "name email role");

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "follow_up",
    entity_id: row._id,
    entity_name: displayEnquiryName(enquiry),
    message: buildActivityMessage({ actorName: user?.name || "User", action: "created", entityLabel: "follow-up", entityName: displayEnquiryName(enquiry) }),
    meta: { enquiry_id: enquiry._id },
  });

  return row;
}

export async function getFollowUpByIdService({ user, enquiryId, followUpId }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }
  const row = await FollowUp.findOne({ _id: followUpId, enquiry_id: enquiry._id })
    .populate("created_by", "name email role");
  if (!row) {
    const err = new Error("Follow-up not found");
    err.statusCode = 404;
    throw err;
  }
  return row;
}

export async function updateFollowUpService({ user, enquiryId, followUpId, body }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }

  const row = await FollowUp.findOne({ _id: followUpId, enquiry_id: enquiry._id });
  if (!row) {
    const err = new Error("Follow-up not found");
    err.statusCode = 404;
    throw err;
  }

  const { followup_date, mode, remarks, outcome, next_followup_date } = body;
  const updatedFields = Object.keys(body || {});

  if (followup_date !== undefined) {
    const d = new Date(followup_date);
    if (Number.isNaN(d.getTime())) {
      const err = new Error("Invalid followup_date");
      err.statusCode = 400;
      throw err;
    }
    row.followup_date = d;
  }
  if (mode !== undefined) row.mode = mode;
  if (remarks !== undefined) row.remarks = String(remarks).trim();
  if (outcome !== undefined) row.outcome = outcome;

  if (next_followup_date !== undefined) {
    if (next_followup_date === null || next_followup_date === "") {
      row.next_followup_date = undefined;
    } else {
      const nd = new Date(next_followup_date);
      if (Number.isNaN(nd.getTime())) {
        const err = new Error("Invalid next_followup_date");
        err.statusCode = 400;
        throw err;
      }
      row.next_followup_date = nd;
    }
  }

  const updated = await row.save();
  await updated.populate("created_by", "name email role");

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "follow_up",
    entity_id: updated._id,
    entity_name: displayEnquiryName(enquiry),
    message: buildActivityMessage({ actorName: user?.name || "User", action: "updated", entityLabel: "follow-up", entityName: displayEnquiryName(enquiry) }),
    meta: { enquiry_id: enquiry._id, updated_fields: [...new Set(updatedFields)] },
  });

  return updated;
}

export async function deleteFollowUpService({ user, enquiryId, followUpId }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }
  const row = await FollowUp.findOne({ _id: followUpId, enquiry_id: enquiry._id });
  if (!row) {
    const err = new Error("Follow-up not found");
    err.statusCode = 404;
    throw err;
  }

  await row.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "follow_up",
    entity_id: row._id,
    entity_name: displayEnquiryName(enquiry),
    message: buildActivityMessage({ actorName: user?.name || "User", action: "deleted", entityLabel: "follow-up", entityName: displayEnquiryName(enquiry) }),
    meta: { enquiry_id: enquiry._id },
  });
}

// ─── Enquiry Document services ────────────────────────────────────────────────


export async function getEnquiryDocumentsService({ user, enquiryId }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }
  return EnquiryDocument.find({ enquiry_id: enquiry._id })
    .populate("created_by", "name email role")
    .sort({ createdAt: -1 });
}

export async function createEnquiryDocumentService({ user, enquiryId, body, files }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }

  let docObj = undefined;

  if (files && files.length > 0) {
    const uploadedDocs = await uploadAuditDocuments(files, "enquiries", enquiry._id);
    if (uploadedDocs.length > 0) {
      docObj = uploadedDocs[0];
      if (body.caption) {
        docObj.caption = String(body.caption).trim();
      }
    }
  }

  if (!docObj) {
    docObj = body.document;
    if (!docObj && body.document_url) {
      docObj = {
        fileUrl: String(body.document_url).trim(),
        fileType: String(body.document_url).trim().toLowerCase().endsWith(".pdf") ? "pdf" : "image",
        fileName: String(body.document_url).trim().split("/").pop() || "Document",
        caption: body.caption ? String(body.caption).trim() : "",
        uploadedAt: new Date(),
      };
    }
  }

  if (!docObj || !docObj.fileUrl) {
    const err = new Error("document file is required");
    err.statusCode = 400;
    throw err;
  }

  const document_number = await generateUniqueEnquiryDocumentNumber();
  const row = await EnquiryDocument.create({
    enquiry_id: enquiry._id,
    document_number,
    document: docObj,
    created_by: user._id,
  });

  await row.populate("created_by", "name email role");

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "enquiry_document",
    entity_id: row._id,
    entity_name: row.document_number || displayEnquiryName(enquiry),
    message: buildActivityMessage({ actorName: user?.name || "User", action: "created", entityLabel: "document", entityName: row.document_number || displayEnquiryName(enquiry) }),
    meta: { enquiry_id: enquiry._id },
  });

  return row;
}

export async function getEnquiryDocumentByIdService({ user, enquiryId, enquiryDocumentId }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }
  const row = await EnquiryDocument.findOne({ _id: enquiryDocumentId, enquiry_id: enquiry._id })
    .populate("created_by", "name email role");
  if (!row) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }
  return row;
}

export async function updateEnquiryDocumentService({ user, enquiryId, enquiryDocumentId, body, files }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }
  const row = await EnquiryDocument.findOne({ _id: enquiryDocumentId, enquiry_id: enquiry._id });
  if (!row) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }

  const { document_number, document, document_url, caption } = body;
  const updatedFields = Object.keys(body || {});

  if (document_number !== undefined) {
    row.document_number = document_number ? String(document_number).trim() : undefined;
  }

  let docObj = undefined;

  if (files && files.length > 0) {
    const uploadedDocs = await uploadAuditDocuments(files, "enquiries", enquiry._id);
    if (uploadedDocs.length > 0) {
      docObj = uploadedDocs[0];
      if (caption !== undefined) {
        docObj.caption = caption ? String(caption).trim() : "";
      }
    }
  }

  if (docObj === undefined) {
    if (document !== undefined) {
      docObj = document;
      if (docObj && caption !== undefined) {
        docObj.caption = caption ? String(caption).trim() : "";
      }
    } else if (document_url !== undefined) {
      if (document_url) {
        docObj = {
          fileUrl: String(document_url).trim(),
          fileType: String(document_url).trim().toLowerCase().endsWith(".pdf") ? "pdf" : "image",
          fileName: String(document_url).trim().split("/").pop() || "Document",
          caption: caption ? String(caption).trim() : (row.document?.caption || ""),
          uploadedAt: new Date(),
        };
      } else {
        docObj = null;
      }
    } else if (caption !== undefined && row.document) {
      docObj = {
        ...row.document.toObject(),
        caption: caption ? String(caption).trim() : "",
      };
    }
  }

  if (docObj !== undefined && docObj !== null) {
    row.document = docObj;
  }

  const updated = await row.save();
  await updated.populate("created_by", "name email role");

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "enquiry_document",
    entity_id: updated._id,
    entity_name: updated.document_number || displayEnquiryName(enquiry),
    message: buildActivityMessage({ actorName: user?.name || "User", action: "updated", entityLabel: "document", entityName: updated.document_number || displayEnquiryName(enquiry) }),
    meta: { enquiry_id: enquiry._id, updated_fields: [...new Set(updatedFields)] },
  });

  return updated;
}

export async function deleteEnquiryDocumentService({ user, enquiryId, enquiryDocumentId, body }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }
  const row = await EnquiryDocument.findOne({ _id: enquiryDocumentId, enquiry_id: enquiry._id });
  if (!row) {
    const err = new Error("Document not found");
    err.statusCode = 404;
    throw err;
  }

  const wf = body?.workflow_remark;
  if (wf != null && String(wf).trim() !== "") {
    const line = `[${new Date().toISOString()}] Document deleted: ${String(wf).trim()}`;
    row.notes = row.notes ? `${row.notes}\n\n${line}` : line;
    await row.save();
  }

  await row.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "enquiry_document",
    entity_id: row._id,
    entity_name: row.document_number || displayEnquiryName(enquiry),
    message: buildActivityMessage({ actorName: user?.name || "User", action: "deleted", entityLabel: "document", entityName: row.document_number || displayEnquiryName(enquiry) }),
    meta: { enquiry_id: enquiry._id },
  });
}
