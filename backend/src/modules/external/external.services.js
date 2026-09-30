import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";
const { Enquiry, Facility, FollowUp, EnquiryDocument, FacilityAuditor } = modelsRegistry;

/**
 * Standardize pagination options
 */
function parsePagination(query = {}) {
  let page = parseInt(query.page, 10);
  let limit = parseInt(query.limit, 10);

  if (Number.isNaN(page) || page < 1) page = 1;
  if (Number.isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * List enquiries for third-party consumers with filtering and pagination.
 */
export async function getExternalEnquiriesService({ query = {} }) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { deleted_at: null };

  // Status filter
  if (query.status || query.enquiry_status) {
    const statusVal = String(query.status || query.enquiry_status).trim();
    if (statusVal) {
      filter.enquiry_status = statusVal;
    }
  }

  // City filter
  if (query.city && typeof query.city === "string") {
    filter.city = { $regex: new RegExp(query.city.trim(), "i") };
  }

  // Audit type filter
  if (query.audit_type) {
    const auditType = String(query.audit_type).trim();
    filter.$or = [
      { requested_audit_types: auditType },
      { "requested_audits.audit_type": auditType },
    ];
  }

  // Converted to facility filter
  if (query.is_converted !== undefined && query.is_converted !== "") {
    filter.is_converted_to_facility = query.is_converted === "true" || query.is_converted === true;
  }

  // Date range filter on created_at
  if (query.startDate || query.endDate) {
    filter.created_at = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (!Number.isNaN(start.getTime())) filter.created_at.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (!Number.isNaN(end.getTime())) filter.created_at.$lte = end;
    }
  }

  // Text search filter
  if (query.search && typeof query.search === "string") {
    const term = query.search.trim();
    const regex = new RegExp(term, "i");
    const searchConditions = [
      { name: regex },
      { enquiry_number: regex },
      { client_email: regex },
      { client_contact_number: regex },
      { client_representative: regex },
      { city: regex },
    ];
    if (filter.$or) {
      filter.$and = [{ $or: filter.$or }, { $or: searchConditions }];
      delete filter.$or;
    } else {
      filter.$or = searchConditions;
    }
  }

  // Sort options
  let sortOption = { created_at: -1 };
  if (query.sortBy) {
    const direction = String(query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
    sortOption = { [query.sortBy]: direction };
  }

  const [total, rows] = await Promise.all([
    Enquiry.countDocuments(filter),
    Enquiry.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("assigned_to", "name email")
      .populate("assigned_manager_to", "name email")
      .populate("assigned_admin_to", "name email")
      .populate("created_by", "name email")
      .populate("converted_facility_id", "name audit_number status city")
      .lean(),
  ]);

  const sanitizedRows = rows.map((enquiry) => ({
    id: enquiry._id,
    enquiry_number: enquiry.enquiry_number,
    name: enquiry.name,
    city: enquiry.city,
    address: enquiry.address || null,
    client_representative: enquiry.client_representative || null,
    client_contact_number: enquiry.client_contact_number || null,
    client_email: enquiry.client_email || null,
    client_representatives: enquiry.client_representatives || [],
    enquiry_status: enquiry.enquiry_status,
    source: enquiry.source || null,
    expected_value: enquiry.expected_value ?? 0,
    requested_audit_types: enquiry.requested_audit_types || [],
    requested_audits: enquiry.requested_audits || [],
    notes: enquiry.notes || null,
    next_followup_date: enquiry.next_followup_date || null,
    is_converted_to_facility: Boolean(enquiry.is_converted_to_facility),
    converted_facility: enquiry.converted_facility_id
      ? {
          id: enquiry.converted_facility_id._id,
          name: enquiry.converted_facility_id.name,
          audit_number: enquiry.converted_facility_id.audit_number,
          status: enquiry.converted_facility_id.status,
          city: enquiry.converted_facility_id.city,
        }
      : null,
    assigned_to: enquiry.assigned_to ? { id: enquiry.assigned_to._id, name: enquiry.assigned_to.name, email: enquiry.assigned_to.email } : null,
    created_at: enquiry.created_at,
    updated_at: enquiry.updated_at,
  }));

  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: sanitizedRows,
  };
}

/**
 * Retrieve single enquiry details by ID or enquiry_number.
 */
export async function getExternalEnquiryByIdService({ enquiryId }) {
  const isObjectId = mongoose.Types.ObjectId.isValid(enquiryId);
  const query = isObjectId
    ? { _id: enquiryId, deleted_at: null }
    : { enquiry_number: enquiryId, deleted_at: null };

  const enquiry = await Enquiry.findOne(query)
    .populate("assigned_to", "name email")
    .populate("assigned_manager_to", "name email")
    .populate("assigned_admin_to", "name email")
    .populate("created_by", "name email")
    .populate("converted_facility_id", "name audit_number status city facility_type start_date closure_date")
    .populate("accepted_quotation_id", "quotationRef status quotationDate financials")
    .lean();

  if (!enquiry) {
    const error = new Error("Enquiry not found");
    error.statusCode = 404;
    throw error;
  }

  // Get follow-up records count and latest follow-up
  const [followUpsCount, latestFollowUp, documentCount] = await Promise.all([
    FollowUp.countDocuments({ enquiry_id: enquiry._id, deleted_at: null }),
    FollowUp.findOne({ enquiry_id: enquiry._id, deleted_at: null })
      .sort({ follow_up_date: -1, created_at: -1 })
      .lean(),
    EnquiryDocument.countDocuments({ enquiry_id: enquiry._id, deleted_at: null }),
  ]);

  return {
    id: enquiry._id,
    enquiry_number: enquiry.enquiry_number,
    name: enquiry.name,
    city: enquiry.city,
    address: enquiry.address || null,
    client_representative: enquiry.client_representative || null,
    client_contact_number: enquiry.client_contact_number || null,
    client_email: enquiry.client_email || null,
    client_representatives: enquiry.client_representatives || [],
    enquiry_status: enquiry.enquiry_status,
    source: enquiry.source || null,
    expected_value: enquiry.expected_value ?? 0,
    requested_audit_types: enquiry.requested_audit_types || [],
    requested_audits: enquiry.requested_audits || [],
    notes: enquiry.notes || null,
    next_followup_date: enquiry.next_followup_date || null,
    is_converted_to_facility: Boolean(enquiry.is_converted_to_facility),
    converted_facility: enquiry.converted_facility_id || null,
    accepted_quotation: enquiry.accepted_quotation_id || null,
    assigned_to: enquiry.assigned_to ? { id: enquiry.assigned_to._id, name: enquiry.assigned_to.name, email: enquiry.assigned_to.email } : null,
    metrics: {
      follow_ups_count: followUpsCount,
      documents_count: documentCount,
      latest_follow_up: latestFollowUp
        ? {
            id: latestFollowUp._id,
            status: latestFollowUp.status,
            notes: latestFollowUp.notes,
            follow_up_date: latestFollowUp.follow_up_date,
            next_followup_date: latestFollowUp.next_followup_date,
          }
        : null,
    },
    created_at: enquiry.created_at,
    updated_at: enquiry.updated_at,
  };
}

/**
 * List facilities for third-party consumers with filtering and pagination.
 */
export async function getExternalFacilitiesService({ query = {} }) {
  const { page, limit, skip } = parsePagination(query);
  const filter = { deleted_at: null };

  // Status filter
  if (query.status) {
    filter.status = String(query.status).trim();
  }

  // Audit type filter
  if (query.audit_type) {
    filter.audit_type = String(query.audit_type).trim();
  }

  // City filter
  if (query.city && typeof query.city === "string") {
    filter.city = { $regex: new RegExp(query.city.trim(), "i") };
  }

  // Facility type filter
  if (query.facility_type) {
    filter.facility_type = String(query.facility_type).trim();
  }

  // Date range filter on start_date
  if (query.startDate || query.endDate) {
    filter.start_date = {};
    if (query.startDate) {
      const start = new Date(query.startDate);
      if (!Number.isNaN(start.getTime())) filter.start_date.$gte = start;
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      if (!Number.isNaN(end.getTime())) filter.start_date.$lte = end;
    }
  }

  // Text search filter
  if (query.search && typeof query.search === "string") {
    const term = query.search.trim();
    const regex = new RegExp(term, "i");
    filter.$or = [
      { name: regex },
      { audit_number: regex },
      { enquiry_number: regex },
      { client_email: regex },
      { client_contact_number: regex },
      { client_representative: regex },
      { city: regex },
    ];
  }

  // Sort options
  let sortOption = { start_date: -1, created_at: -1 };
  if (query.sortBy) {
    const direction = String(query.sortOrder || "desc").toLowerCase() === "asc" ? 1 : -1;
    sortOption = { [query.sortBy]: direction };
  }

  const [total, rows] = await Promise.all([
    Facility.countDocuments(filter),
    Facility.find(filter)
      .sort(sortOption)
      .skip(skip)
      .limit(limit)
      .populate("owner_user_id", "name email")
      .populate("auditor_id", "name email")
      .populate("created_by", "name email")
      .lean(),
  ]);

  // Fetch assigned auditors for facilities
  const facilityIds = rows.map((f) => f._id);
  const auditorAssignments = await FacilityAuditor.find({
    facility_id: { $in: facilityIds },
  })
    .populate("user_id", "name email")
    .lean();

  const assignmentsByFacility = {};
  auditorAssignments.forEach((assign) => {
    const fid = String(assign.facility_id);
    if (!assignmentsByFacility[fid]) {
      assignmentsByFacility[fid] = [];
    }
    if (assign.user_id) {
      assignmentsByFacility[fid].push({
        id: assign.user_id._id,
        name: assign.user_id.name,
        email: assign.user_id.email,
        assigned_role: assign.assigned_role || "Auditor",
      });
    }
  });

  const sanitizedRows = rows.map((fac) => ({
    id: fac._id,
    audit_number: fac.audit_number,
    enquiry_number: fac.enquiry_number || null,
    name: fac.name,
    city: fac.city,
    address: fac.address || null,
    client_representative: fac.client_representative || null,
    client_contact_number: fac.client_contact_number || null,
    client_email: fac.client_email || null,
    client_representatives: fac.client_representatives || [],
    facility_type: fac.facility_type || null,
    audit_type: fac.audit_type,
    status: fac.status,
    start_date: fac.start_date || null,
    closure_date: fac.closure_date || null,
    expected_value: fac.expected_value ?? null,
    budget: fac.budget || null,
    audit_closure: fac.audit_closure?.closed_at
      ? {
          is_closed: true,
          closed_at: fac.audit_closure.closed_at,
        }
      : { is_closed: false },
    assigned_auditors: assignmentsByFacility[String(fac._id)] || [],
    created_at: fac.created_at,
    updated_at: fac.updated_at,
  }));

  return {
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
    data: sanitizedRows,
  };
}

/**
 * Retrieve single facility details by ID or audit_number.
 */
export async function getExternalFacilityByIdService({ facilityId }) {
  const isObjectId = mongoose.Types.ObjectId.isValid(facilityId);
  const query = isObjectId
    ? { _id: facilityId, deleted_at: null }
    : { audit_number: facilityId, deleted_at: null };

  const facility = await Facility.findOne(query)
    .populate("owner_user_id", "name email")
    .populate("auditor_id", "name email")
    .populate("created_by", "name email")
    .populate("audit_closure.closed_by", "name email")
    .lean();

  if (!facility) {
    const error = new Error("Facility not found");
    error.statusCode = 404;
    throw error;
  }

  const assignedAuditorsDocs = await FacilityAuditor.find({
    facility_id: facility._id,
  })
    .populate("user_id", "name email")
    .lean();

  const assignedAuditors = assignedAuditorsDocs
    .filter((a) => a.user_id)
    .map((a) => ({
      id: a.user_id._id,
      name: a.user_id.name,
      email: a.user_id.email,
      assigned_role: a.assigned_role || "Auditor",
    }));

  return {
    id: facility._id,
    audit_number: facility.audit_number,
    enquiry_number: facility.enquiry_number || null,
    name: facility.name,
    city: facility.city,
    address: facility.address || null,
    client_representative: facility.client_representative || null,
    client_contact_number: facility.client_contact_number || null,
    client_email: facility.client_email || null,
    client_representatives: facility.client_representatives || [],
    facility_type: facility.facility_type || null,
    audit_type: facility.audit_type,
    status: facility.status,
    start_date: facility.start_date || null,
    closure_date: facility.closure_date || null,
    expected_value: facility.expected_value ?? null,
    budget: facility.budget || null,
    audit_closure: facility.audit_closure?.closed_at
      ? {
          is_closed: true,
          closed_at: facility.audit_closure.closed_at,
          closed_by: facility.audit_closure.closed_by
            ? {
                id: facility.audit_closure.closed_by._id,
                name: facility.audit_closure.closed_by.name,
                email: facility.audit_closure.closed_by.email,
              }
            : null,
        }
      : { is_closed: false },
    documents_count: facility.documents?.length || 0,
    assigned_auditors: assignedAuditors,
    created_at: facility.created_at,
    updated_at: facility.updated_at,
  };
}
