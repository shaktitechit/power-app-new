import { modelsRegistry } from "../../data/modelRegistry.js";
const { Enquiry, FollowUp, EnquiryDocument, Facility, Quotation } = modelsRegistry;
import crypto from "crypto";
import mongoose from "mongoose";
import { uploadAuditDocuments } from "../shared/electrical-audit.helpers.js";




import { createRecentActivity } from "../../helpers/createRecentActivity.js";
import { buildActivityMessage } from "../../helpers/buildActivityMessage.js";
import { createNotification } from "../../services/notificationService.js";

// ─── Constants ────────────────────────────────────────────────────────────────
export const ENQUIRY_STATUSES = [
  "new",
  "assigned",
  "follow_up",
  "eoi_sent",
  "quoted",
  "won",
  "lost",
  "dropped",
  "contacted",
  "in_discussion",
  "eoq_uploaded",
  "negotiation",
];

const PIPELINE_RANK = {
  new: 0,
  contacted: 1,
  assigned: 1,
  in_discussion: 2,
  follow_up: 2,
  eoq_uploaded: 3,
  eoi_sent: 3,
  negotiation: 4,
  quoted: 4,
  won: 5,
  lost: 5,
  dropped: 5,
};

const TERMINAL_STATUSES = new Set(["won", "lost", "dropped"]);

const STATUS_FILTER_ALIASES = {
  assigned: ["assigned", "contacted"],
  follow_up: ["follow_up", "in_discussion"],
  eoi_sent: ["eoi_sent", "eoq_uploaded"],
  quoted: ["quoted", "negotiation"],
};

function applyPipelineAdvance(enquiry, targetStatus) {
  if (!enquiry || TERMINAL_STATUSES.has(String(enquiry.enquiry_status))) return false;
  const currentRank = PIPELINE_RANK[enquiry.enquiry_status] ?? 0;
  const targetRank = PIPELINE_RANK[targetStatus] ?? 0;
  if (targetRank <= currentRank) return false;
  enquiry.enquiry_status = targetStatus;
  return true;
}

export async function savePipelineAdvance(enquiry, targetStatus) {
  if (!applyPipelineAdvance(enquiry, targetStatus)) return enquiry;
  await enquiry.save();
  return enquiry;
}
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
    .map((rep) => {
      const name = String(rep?.name || "").trim();
      const contact_number = String(rep?.contact_number || "").trim();
      const email = String(rep?.email || "").trim();
      return {
        ...(name ? { name } : {}),
        ...(contact_number ? { contact_number } : {}),
        ...(email ? { email } : {}),
      };
    })
    .filter((rep) => rep.name || rep.contact_number || rep.email);
}

async function generateUniqueEnquiryDocumentNumber(kind = "other") {
  const prefix =
    kind === "eoi" ? "EOI" : kind === "quotation" ? "QUO" : "DOC";
  const maxAttempts = 12;
  for (let i = 0; i < maxAttempts; i++) {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8);
    const candidate = `${prefix}-${ymd}-${rand}`;
    const taken = await EnquiryDocument.findOne({ document_number: candidate, deleted_at: null })
      .select("_id")
      .lean();
    if (!taken) return candidate;
  }
  return `${prefix}-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
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

/**
 * Normalise the per-audit expected value breakdown. Accepts plain audit-type
 * strings too, so a client that only knows about requested_audit_types still
 * produces valid rows (with a zero amount).
 */
export function parseRequestedAudits(value) {
  if (value == null) return undefined;
  let arr = value;
  if (typeof value === "string") {
    try { arr = JSON.parse(value); } catch { return undefined; }
  }
  if (!Array.isArray(arr)) return undefined;

  const seen = new Set();
  const rows = [];
  for (const entry of arr) {
    const audit_type =
      typeof entry === "string" ? entry : String(entry?.audit_type ?? "").trim();
    if (!AUDIT_TYPES.includes(audit_type) || seen.has(audit_type)) continue;
    seen.add(audit_type);

    const raw = typeof entry === "string" ? 0 : entry?.expected_value;
    const amount = raw === "" || raw == null ? 0 : Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      const err = new Error(`Invalid expected_value for ${audit_type}`);
      err.statusCode = 400;
      throw err;
    }
    rows.push({ audit_type, expected_value: amount });
  }
  return rows;
}

export function sumRequestedAudits(rows) {
  return (rows ?? []).reduce(
    (total, row) => total + (Number(row?.expected_value) || 0),
    0,
  );
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
    { path: "assigned_manager_to", select: "name email role" },
    { path: "assigned_admin_to", select: "name email role" },
    { path: "created_by", select: "name email role" },
    { path: "converted_facility_id", select: "name city status" },
    { path: "accepted_quotation_id", select: "quotationRef status quotationDate financials.grandTotal financials.roundedGrandTotal" },
  ];
}

export function applyEnquiryVisibilityFilter(query, user) {
  if (!user?._id) return;
  if (user.role === "super_admin") return;
  if (user.role === "admin") {
    query.assigned_admin_to = user._id;
    return;
  }
  if (user.role === "manager") {
    query.$or = [
      { assigned_manager_to: user._id },
      { assigned_to: user._id },
    ];
    return;
  }
  if (user.role === "auditor") {
    query.assigned_to = user._id;
    return;
  }
  query.$or = [
    { assigned_to: user._id },
    { assigned_manager_to: user._id },
    { assigned_admin_to: user._id },
  ];
}

function isAssignedToUser(enquiry, user) {
  if (!enquiry || !user?._id) return false;
  const uid = user._id.toString();
  if (enquiry.assigned_to?.toString() === uid) return true;
  if (enquiry.assigned_manager_to?.toString() === uid) return true;
  if (enquiry.assigned_admin_to?.toString() === uid) return true;
  return false;
}

/**
 * Resolve an enquiry the user is allowed to access.
 * super_admin → any enquiry.
 * admin / manager / auditor → only enquiries assigned to them for that role.
 */
export async function resolveAccessibleEnquiry(user, enquiryId) {
  if (!user?._id || !enquiryId) return null;
  const id = typeof enquiryId === "object" ? enquiryId._id : enquiryId;
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return null;

  const enquiry = await Enquiry.findById(id);
  if (!enquiry) return null;
  if (user?.role === "super_admin") return enquiry;
  if (isAssignedToUser(enquiry, user)) return enquiry;

  return null;
}

function recipientIdFromRef(ref) {
  if (!ref) return null;
  return ref._id || ref;
}

function resolveCreateAssignees(user, assigned_to, assigned_manager_to, assigned_admin_to) {
  if (user?.role === "super_admin") {
    return {
      assigned_to: assigned_to || undefined,
      assigned_manager_to: assigned_manager_to || undefined,
      assigned_admin_to: assigned_admin_to || undefined,
    };
  }
  return {
    assigned_to: user?.role === "auditor" ? user._id : undefined,
    assigned_manager_to: user?.role === "manager" ? user._id : undefined,
    assigned_admin_to: user?.role === "admin" ? user._id : undefined,
  };
}

async function notifyAssignee(io, { recipientId, senderId, enquiry }) {
  const id = recipientIdFromRef(recipientId);
  if (!id) return;
  await createNotification(io, {
    recipient: id,
    sender: senderId,
    title: "New Enquiry Assigned",
    message: `You have been assigned to enquiry: ${displayEnquiryName(enquiry)}`,
    type: "enquiry",
    referenceId: enquiry._id,
  });
}

// ─── Enquiry services ─────────────────────────────────────────────────────────

export async function createEnquiryService({ user, body, io }) {
  const {
    name, city, address,
    client_representative, client_contact_number, client_email,
    client_representatives,
    assigned_to: assignedRaw,
    assigned_manager_to: assignedManagerRaw,
    assigned_admin_to: assignedAdminRaw,
    enquiry_status, source, expected_value,
    requested_audit_types, requested_audits, notes, next_followup_date,
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
      : parseClientRepresentatives([
          {
            name: client_representative,
            contact_number: client_contact_number,
            email: client_email,
          },
        ]);
  const primaryRep = fallbackClientReps[0];

  const assigned_to = parseOptionalObjectId(assignedRaw);
  if (assignedRaw && assigned_to === undefined) {
    const err = new Error("Invalid assigned_to");
    err.statusCode = 400;
    throw err;
  }

  const assigned_manager_to = parseOptionalObjectId(assignedManagerRaw);
  if (assignedManagerRaw && assigned_manager_to === undefined) {
    const err = new Error("Invalid assigned_manager_to");
    err.statusCode = 400;
    throw err;
  }

  const assigned_admin_to = parseOptionalObjectId(assignedAdminRaw);
  if (assignedAdminRaw && assigned_admin_to === undefined) {
    const err = new Error("Invalid assigned_admin_to");
    err.statusCode = 400;
    throw err;
  }

  const assignees = resolveCreateAssignees(
    user,
    assigned_to,
    assigned_manager_to,
    assigned_admin_to,
  );

  if (enquiry_status != null && !ENQUIRY_STATUSES.includes(String(enquiry_status))) {
    const err = new Error("Invalid enquiry_status");
    err.statusCode = 400;
    throw err;
  }

  // The per-audit breakdown owns both the audit type list and the total when
  // it is supplied; otherwise fall back to the flat fields.
  const auditRows = parseRequestedAudits(requested_audits);
  const auditTypes = auditRows
    ? auditRows.map((row) => row.audit_type)
    : parseRequestedAuditTypes(requested_audit_types);
  const totalExpectedValue = auditRows
    ? (auditRows.length > 0 ? sumRequestedAudits(auditRows) : undefined)
    : (expected_value !== undefined && expected_value !== "" ? Number(expected_value) : undefined);

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

  let status = enquiry_status || "new";
  if (
    (assignees.assigned_to || assignees.assigned_manager_to || assignees.assigned_admin_to) &&
    !TERMINAL_STATUSES.has(String(status))
  ) {
    const currentRank = PIPELINE_RANK[status] ?? 0;
    if (currentRank < PIPELINE_RANK.assigned) status = "assigned";
  }

  const enquiry = await Enquiry.create({
    name: String(name).trim(),
    city: String(city).trim(),
    address: address != null ? String(address).trim() : undefined,
    client_representative: primaryRep?.name || (client_representative != null ? String(client_representative).trim() : undefined),
    client_contact_number: primaryRep?.contact_number || client_contact_number,
    client_email: primaryRep?.email || client_email,
    client_representatives: fallbackClientReps,
    assigned_to: assignees.assigned_to,
    assigned_manager_to: assignees.assigned_manager_to,
    assigned_admin_to: assignees.assigned_admin_to,
    enquiry_status: status,
    source: source != null ? String(source).trim() : undefined,
    expected_value: totalExpectedValue,
    requested_audit_types: auditTypes ?? [],
    requested_audits: auditRows ?? [],
    notes: notes != null ? String(notes).trim() : undefined,
    next_followup_date: nextFollowup,
    created_by: user._id,
  });

  await enquiry.populate(buildEnquiryPopulate());

  await notifyAssignee(io, {
    recipientId: enquiry.assigned_to?._id,
    senderId: user._id,
    enquiry,
  });
  await notifyAssignee(io, {
    recipientId: enquiry.assigned_manager_to?._id,
    senderId: user._id,
    enquiry,
  });
  await notifyAssignee(io, {
    recipientId: enquiry.assigned_admin_to?._id,
    senderId: user._id,
    enquiry,
  });

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
    const status = String(rawQuery.enquiry_status);
    const aliases = STATUS_FILTER_ALIASES[status];
    query.enquiry_status = aliases ? { $in: aliases } : status;
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

  if (rawQuery.assigned_manager_to) {
    const aid = parseOptionalObjectId(rawQuery.assigned_manager_to);
    if (!aid) {
      const err = new Error("Invalid assigned_manager_to filter");
      err.statusCode = 400;
      throw err;
    }
    query.assigned_manager_to = aid;
  }

  if (rawQuery.assigned_admin_to) {
    const aid = parseOptionalObjectId(rawQuery.assigned_admin_to);
    if (!aid) {
      const err = new Error("Invalid assigned_admin_to filter");
      err.statusCode = 400;
      throw err;
    }
    query.assigned_admin_to = aid;
  }

  applyEnquiryVisibilityFilter(query, user);

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
    assigned_manager_to: assignedManagerRaw,
    assigned_admin_to: assignedAdminRaw,
    enquiry_status, source, expected_value,
    requested_audit_types, requested_audits, notes, next_followup_date,
    is_converted_to_facility,
    converted_facility_id: convertedFacilityRaw,
    accepted_quotation_id: acceptedQuotationRaw,
  } = body;

  const updatedFields = Object.keys(body || {});

  if (name !== undefined) enquiry.name = String(name).trim();
  if (city !== undefined) enquiry.city = String(city).trim();
  if (address !== undefined) enquiry.address = String(address).trim();
  if (client_representative !== undefined) enquiry.client_representative = client_representative ? String(client_representative).trim() : "";
  if (client_contact_number !== undefined) enquiry.client_contact_number = client_contact_number;
  if (client_email !== undefined) enquiry.client_email = client_email;
  if (client_representatives !== undefined) {
    enquiry.client_representatives = parseClientRepresentatives(client_representatives);
    const primaryRep = enquiry.client_representatives[0];
    if (client_representative === undefined) {
      enquiry.client_representative = primaryRep?.name || "";
    }
    if (client_contact_number === undefined) {
      enquiry.client_contact_number = primaryRep?.contact_number;
    }
    if (client_email === undefined) {
      enquiry.client_email = primaryRep?.email;
    }
  }

  const applyAssigneeUpdate = (raw, fieldName) => {
    if (raw === undefined) return false;
    if (raw === null || raw === "") {
      enquiry[fieldName] = undefined;
      return false;
    }
    const aid = parseOptionalObjectId(raw);
    if (!aid) {
      const err = new Error(`Invalid ${fieldName}`);
      err.statusCode = 400;
      throw err;
    }
    enquiry[fieldName] = aid;
    return true;
  };

  const canAssignAll = user?.role === "super_admin";
  const assignedAuditorUpdated = canAssignAll
    ? applyAssigneeUpdate(assignedRaw, "assigned_to")
    : false;
  const assignedManagerUpdated = canAssignAll
    ? applyAssigneeUpdate(assignedManagerRaw, "assigned_manager_to")
    : false;
  const assignedAdminUpdated = canAssignAll
    ? applyAssigneeUpdate(assignedAdminRaw, "assigned_admin_to")
    : false;
  if (
    enquiry_status === undefined &&
    (assignedAuditorUpdated || assignedManagerUpdated || assignedAdminUpdated)
  ) {
    applyPipelineAdvance(enquiry, "assigned");
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

  const auditRows = requested_audits !== undefined
    ? (parseRequestedAudits(requested_audits) ?? [])
    : undefined;

  if (auditRows !== undefined) {
    enquiry.requested_audits = auditRows;
    enquiry.requested_audit_types = auditRows.map((row) => row.audit_type);
    enquiry.expected_value = auditRows.length > 0 ? sumRequestedAudits(auditRows) : undefined;
  } else {
    if (expected_value !== undefined) {
      enquiry.expected_value = expected_value === "" || expected_value == null ? undefined : Number(expected_value);
    }
    if (requested_audit_types !== undefined) {
      const types = parseRequestedAuditTypes(requested_audit_types) ?? [];
      enquiry.requested_audit_types = types;
      // Drop stale per-audit amounts for audits that are no longer requested.
      enquiry.requested_audits = (enquiry.requested_audits ?? []).filter((row) =>
        types.includes(row?.audit_type),
      );
    }
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

  if (acceptedQuotationRaw !== undefined) {
    if (acceptedQuotationRaw === null || acceptedQuotationRaw === "") {
      if (String(enquiry.enquiry_status || "").toLowerCase() === "won") {
        const err = new Error("An accepted quotation is required for won enquiries");
        err.statusCode = 400;
        throw err;
      }
      enquiry.accepted_quotation_id = undefined;
    } else {
      const qid = parseOptionalObjectId(acceptedQuotationRaw);
      if (!qid) {
        const err = new Error("Invalid accepted_quotation_id");
        err.statusCode = 400;
        throw err;
      }
      const quotation = await Quotation.findById(qid).exec();
      if (!quotation) {
        const err = new Error("Quotation not found");
        err.statusCode = 400;
        throw err;
      }
      if (String(quotation.status || "").toUpperCase() !== "ACCEPTED") {
        const err = new Error("Only accepted quotations can be linked when marking an enquiry as won");
        err.statusCode = 400;
        throw err;
      }
      const linkedEnquiryId =
        quotation.enquiryId != null ? String(quotation.enquiryId) : "";
      if (linkedEnquiryId && linkedEnquiryId !== String(enquiry._id)) {
        const err = new Error("Quotation does not belong to this enquiry");
        err.statusCode = 400;
        throw err;
      }
      enquiry.accepted_quotation_id = qid;
    }
  }

  if (String(enquiry.enquiry_status || "").toLowerCase() === "won") {
    if (!enquiry.accepted_quotation_id) {
      const err = new Error("An accepted quotation is required before marking an enquiry as won");
      err.statusCode = 400;
      throw err;
    }
    const linkedQuotation = await Quotation.findById(enquiry.accepted_quotation_id).exec();
    if (!linkedQuotation) {
      const err = new Error("Accepted quotation not found");
      err.statusCode = 400;
      throw err;
    }
    if (String(linkedQuotation.status || "").toUpperCase() !== "ACCEPTED") {
      const err = new Error("Only accepted quotations can be linked to a won enquiry");
      err.statusCode = 400;
      throw err;
    }
    const linkedEnquiryId =
      linkedQuotation.enquiryId != null ? String(linkedQuotation.enquiryId) : "";
    if (linkedEnquiryId && linkedEnquiryId !== String(enquiry._id)) {
      const err = new Error("Accepted quotation does not belong to this enquiry");
      err.statusCode = 400;
      throw err;
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

  if (assignedAuditorUpdated) {
    await notifyAssignee(io, {
      recipientId: updated.assigned_to,
      senderId: user._id,
      enquiry: updated,
    });
  }
  if (assignedManagerUpdated) {
    await notifyAssignee(io, {
      recipientId: updated.assigned_manager_to,
      senderId: user._id,
      enquiry: updated,
    });
  }
  if (assignedAdminUpdated) {
    await notifyAssignee(io, {
      recipientId: updated.assigned_admin_to,
      senderId: user._id,
      enquiry: updated,
    });
  }

  if (enquiry_status !== undefined) {
    const recipientId =
      updated.assigned_to?._id ||
      updated.assigned_manager_to?._id ||
      updated.assigned_admin_to?._id ||
      updated.created_by?._id;
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

/** Latest follow-up outcome/remarks per accessible enquiry (for follow-up queue). */
export async function getLatestFollowUpsService({ user }) {
  const query = {};
  applyEnquiryVisibilityFilter(query, user);
  const enquiryIds = await Enquiry.find(query).distinct("_id");
  if (enquiryIds.length === 0) return {};

  const rows = await FollowUp.aggregate([
    {
      $match: {
        enquiry_id: { $in: enquiryIds },
        deleted_at: null,
      },
    },
    { $sort: { followup_date: -1, createdAt: -1 } },
    {
      $group: {
        _id: "$enquiry_id",
        outcome: { $first: "$outcome" },
        remarks: { $first: "$remarks" },
        followup_date: { $first: "$followup_date" },
      },
    },
  ]);

  const map = {};
  for (const row of rows) {
    map[String(row._id)] = {
      outcome: row.outcome ?? null,
      remarks: row.remarks ?? null,
      followup_date: row.followup_date ?? null,
    };
  }
  return map;
}

export async function createFollowUpService({ user, enquiryId, body }) {
  const enquiry = await resolveAccessibleEnquiry(user, enquiryId);
  if (!enquiry) {
    const err = new Error("Enquiry not found");
    err.statusCode = 404;
    throw err;
  }

  const { followup_date, mode, remarks, outcome, next_followup_date } = body;

  // Logged when the contact actually happened, so default to now.
  const fd = followup_date ? new Date(followup_date) : new Date();
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
    mode: mode || undefined,
    remarks: remarks != null ? String(remarks).trim() : undefined,
    outcome: outcome || undefined,
    next_followup_date: nextFd,
    created_by: user._id,
  });
  await row.populate("created_by", "name email role");

  await savePipelineAdvance(enquiry, "follow_up");

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
  if (mode !== undefined) row.mode = mode || undefined;
  if (remarks !== undefined) row.remarks = String(remarks).trim();
  if (outcome !== undefined) row.outcome = outcome || undefined;

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

  const DOCUMENT_KINDS = ["eoi", "quotation", "other"];
  const document_kind = DOCUMENT_KINDS.includes(String(body.document_kind))
    ? String(body.document_kind)
    : "other";

  const document_number = await generateUniqueEnquiryDocumentNumber(document_kind);
  const row = await EnquiryDocument.create({
    enquiry_id: enquiry._id,
    document_number,
    document_kind,
    document: docObj,
    created_by: user._id,
  });

  await row.populate("created_by", "name email role");

  if (document_kind === "eoi") {
    await savePipelineAdvance(enquiry, "eoi_sent");
  } else if (document_kind === "quotation") {
    await savePipelineAdvance(enquiry, "quoted");
  }

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
