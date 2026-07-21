import mongoose from "mongoose";
import { modelsRegistry } from "../../data/modelRegistry.js";
const { Facility, Enquiry, FacilityAuditor, UtilityAccount } = modelsRegistry;
import { can } from "../../services/authorization/index.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import {
  uploadAuditDocuments,
  parseAuditorIds,
  parseClientRepresentatives,
  createRecentActivity,
  buildActivityMessage,
  createNotification,
  isAdmin,
  resolveAccessibleFacility,
  resolveAuditorId,
  applyAuditorIdFromBody,
} from "../shared/electrical-audit.helpers.js";
import { buildUtilityProgressMapForFacilities } from "../dashboard/facility-utility-progress.js";

export const createFacilityService = async ({ user, body, files, io }) => {
  const {
    name,
    city,
    address,
    client_representative,
    client_contact_number,
    client_email,
    facility_type,
    audit_type,
    audit_types,
    status,
    start_date,
    closure_date,
    auditor_ids,
    client_representatives,
    budget: budgetRaw,
    enquiry_number,
  } = body;

  if (!name || !city) {
    const error = new Error("Name and city are required");
    error.statusCode = 400;
    throw error;
  }

  // Parse audit types
  let selectedAuditTypes = [];
  if (audit_types) {
    try {
      selectedAuditTypes = typeof audit_types === "string" ? JSON.parse(audit_types) : audit_types;
    } catch {
      selectedAuditTypes = [audit_types];
    }
  } else if (audit_type) {
    selectedAuditTypes = [audit_type];
  }

  if (!Array.isArray(selectedAuditTypes) || selectedAuditTypes.length === 0) {
    selectedAuditTypes = ["Electrical Energy Audit"];
  }

  const parsedAuditorIds = parseAuditorIds(auditor_ids);
  const parsedClientRepresentatives = parseClientRepresentatives(
    client_representatives,
  );
  const fallbackClientRepresentatives = parsedClientRepresentatives.length
    ? parsedClientRepresentatives
    : client_representative || client_contact_number || client_email
      ? [
        {
          name: String(client_representative || "").trim(),
          contact_number: String(client_contact_number || "").trim(),
          email: String(client_email || "").trim(),
        },
      ]
      : [];

  const baseFacilityId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "facilities",
    baseFacilityId,
  );

  let captions = [];
  if (body?.captions) {
    try {
      captions =
        typeof body.captions === "string"
          ? JSON.parse(body.captions)
          : body.captions;
    } catch {
      captions = [];
    }
  }

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  const parseNumberOrNull = (v) => {
    const n = Number(v);
    return v !== undefined && v !== null && v !== "" && !isNaN(n) ? n : null;
  };
  let parsedBudget = undefined;
  if (budgetRaw !== undefined) {
    const b = typeof budgetRaw === "string" ? JSON.parse(budgetRaw) : budgetRaw;
    parsedBudget = {
      no_of_persons: parseNumberOrNull(b?.no_of_persons),
      no_planned_site_visits: parseNumberOrNull(b?.no_planned_site_visits),
      tentative_budget: parseNumberOrNull(b?.tentative_budget),
      actual_budget: parseNumberOrNull(b?.actual_budget),
    };
  }

  const createdFacilities = [];

  for (const currentAuditType of selectedAuditTypes) {
    const facilityId = new mongoose.Types.ObjectId();
    const facility = await Facility.create({
      _id: facilityId,
      owner_user_id: user._id,
      created_by: user._id,
      name,
      city,
      address,
      client_representative,
      client_contact_number,
      client_email,
      client_representatives: fallbackClientRepresentatives,
      facility_type: facility_type !== undefined && facility_type !== null
        ? String(facility_type).trim()
        : "",
      audit_type: currentAuditType,
      status,
      start_date,
      closure_date,
      enquiry_number: enquiry_number ? String(enquiry_number).trim() : undefined,
      auditor_id: resolveAuditorId(user, body) || parsedAuditorIds[0] || undefined,
      documents: uploadedDocuments,
      ...(parsedBudget !== undefined && { budget: parsedBudget }),
    });

    if (parsedAuditorIds.length > 0) {
      const facilityAuditorDocs = parsedAuditorIds.map((auditorId) => ({
        facility_id: facility._id,
        user_id: auditorId,
        assigned_by: user._id,
      }));

      await FacilityAuditor.insertMany(facilityAuditorDocs, { ordered: false });

      for (const auditorId of parsedAuditorIds) {
        await createNotification(io, {
          recipient: auditorId,
          sender: user._id,
          title: "New Facility Assignment",
          message: `You have been assigned to facility: ${facility.name} (${currentAuditType})`,
          type: "facility",
          referenceId: facility._id,
        });
      }

      await createRecentActivity({
        actor: user,
        action: "assigned",
        entity_type: "facility",
        entity_id: facility._id,
        entity_name: facility.name,
        facility_id: facility._id,
        message: `${user?.name || "User"} assigned auditors to facility "${facility.name}"`,
        meta: {
          auditor_ids: parsedAuditorIds,
        },
      });
    }

    await createRecentActivity({
      actor: user,
      action: "created",
      entity_type: "facility",
      entity_id: facility._id,
      entity_name: facility.name,
      facility_id: facility._id,
      message: buildActivityMessage({
        actorName: user?.name || "User",
        action: "created",
        entityLabel: "facility",
        entityName: facility.name,
      }),
      meta: {
        city: facility.city,
        facility_type: facility.facility_type,
        assigned_auditors_count: parsedAuditorIds.length,
      },
    });

    createdFacilities.push(facility);
  }

  // Return the first one for type compatibility or single responses
  return createdFacilities[0];
};

export const createFacilityFromEnquiryService = async ({ user, enquiryId, body, files, io }) => {
  if (!isAdmin(user)) {
    const error = new Error("Only super administrators can create a facility from a submitted enquiry");
    error.statusCode = 403;
    throw error;
  }

  if (!enquiryId || !mongoose.Types.ObjectId.isValid(String(enquiryId))) {
    const error = new Error("Invalid enquiry id");
    error.statusCode = 400;
    throw error;
  }

  const enquiry = await Enquiry.findById(enquiryId).exec();
  if (!enquiry) {
    const error = new Error("Enquiry not found");
    error.statusCode = 404;
    throw error;
  }

  if (enquiry.enquiry_status !== "won") {
    const error = new Error("Only submitted (won) enquiries can be converted to a facility");
    error.statusCode = 400;
    throw error;
  }

  if (
    enquiry.is_converted_to_facility ||
    (enquiry.converted_facility_id != null &&
      String(enquiry.converted_facility_id).length > 0)
  ) {
    const error = new Error("This enquiry already has an associated facility");
    error.statusCode = 409;
    throw error;
  }

  const {
    name,
    city,
    address,
    client_representative,
    client_contact_number,
    client_email,
    facility_type,
    audit_type,
    audit_types,
    status,
    start_date,
    closure_date,
    auditor_ids,
    client_representatives,
    budget: budgetRaw,
  } = body;

  if (!name || !city) {
    const error = new Error("Name and city are required");
    error.statusCode = 400;
    throw error;
  }

  // Parse audit types
  let selectedAuditTypes = [];
  if (audit_types) {
    try {
      selectedAuditTypes = typeof audit_types === "string" ? JSON.parse(audit_types) : audit_types;
    } catch {
      selectedAuditTypes = [audit_types];
    }
  } else if (audit_type) {
    selectedAuditTypes = [audit_type];
  }

  if (!Array.isArray(selectedAuditTypes) || selectedAuditTypes.length === 0) {
    selectedAuditTypes = ["Electrical Energy Audit"];
  }

  const parsedAuditorIds = parseAuditorIds(auditor_ids);
  const parsedClientRepresentatives = parseClientRepresentatives(
    client_representatives,
  );
  const fallbackClientRepresentatives = parsedClientRepresentatives.length
    ? parsedClientRepresentatives
    : client_representative || client_contact_number || client_email
      ? [
        {
          name: String(client_representative || "").trim(),
          contact_number: String(client_contact_number || "").trim(),
          email: String(client_email || "").trim(),
        },
      ]
      : [];

  const baseFacilityId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(files, "facilities", baseFacilityId);

  let captions = [];
  if (body?.captions) {
    try {
      captions =
        typeof body.captions === "string"
          ? JSON.parse(body.captions)
          : body.captions;
    } catch {
      captions = [];
    }
  }

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  const parseNumberOrNull = (v) => {
    const n = Number(v);
    return v !== undefined && v !== null && v !== "" && !isNaN(n) ? n : null;
  };
  let parsedBudget = undefined;
  if (budgetRaw !== undefined) {
    const b = typeof budgetRaw === "string" ? JSON.parse(budgetRaw) : budgetRaw;
    parsedBudget = {
      no_of_persons: parseNumberOrNull(b?.no_of_persons),
      no_planned_site_visits: parseNumberOrNull(b?.no_planned_site_visits),
      tentative_budget: parseNumberOrNull(b?.tentative_budget),
      actual_budget: parseNumberOrNull(b?.actual_budget),
    };
  }

  const createdFacilities = [];

  for (const currentAuditType of selectedAuditTypes) {
    const facilityId = new mongoose.Types.ObjectId();
    const facility = await Facility.create({
      _id: facilityId,
      owner_user_id: user._id,
      created_by: user._id,
      name,
      city,
      address,
      client_representative,
      client_contact_number,
      client_email,
      client_representatives: fallbackClientRepresentatives,
      facility_type:
        facility_type !== undefined && facility_type !== null
          ? String(facility_type).trim()
          : "",
      audit_type: currentAuditType,
      status,
      start_date,
      closure_date,
      enquiry_number: enquiry.enquiry_number,
      auditor_id: resolveAuditorId(user, body) || parsedAuditorIds[0] || undefined,
      documents: uploadedDocuments,
      ...(parsedBudget !== undefined && { budget: parsedBudget }),
    });

    if (parsedAuditorIds.length > 0) {
      const facilityAuditorDocs = parsedAuditorIds.map((auditorId) => ({
        facility_id: facility._id,
        user_id: auditorId,
        assigned_by: user._id,
      }));

      await FacilityAuditor.insertMany(facilityAuditorDocs, { ordered: false });

      // Send notifications to assigned auditors if io is available
      if (io) {
        for (const auditorId of parsedAuditorIds) {
          await createNotification(io, {
            recipient: auditorId,
            sender: user._id,
            title: "New Facility Assignment",
            message: `You have been assigned to facility: ${facility.name} (${currentAuditType})`,
            type: "facility",
            referenceId: facility._id,
          });
        }
      }

      await createRecentActivity({
        actor: user,
        action: "assigned",
        entity_type: "facility",
        entity_id: facility._id,
        entity_name: facility.name,
        facility_id: facility._id,
        message: `${user?.name || "User"} assigned auditors to facility "${facility.name}"`,
        meta: {
          auditor_ids: parsedAuditorIds,
        },
      });
    }

    await createRecentActivity({
      actor: user,
      action: "created",
      entity_type: "facility",
      entity_id: facility._id,
      entity_name: facility.name,
      facility_id: facility._id,
      message: buildActivityMessage({
        actorName: user?.name || "User",
        action: "created",
        entityLabel: "facility",
        entityName: facility.name,
      }),
      meta: {
        city: facility.city,
        facility_type: facility.facility_type,
        assigned_auditors_count: parsedAuditorIds.length,
        from_enquiry_id: enquiry._id?.toString(),
      },
    });

    createdFacilities.push(facility);
  }

  // Link the enquiry to the first created facility
  const primaryFacility = createdFacilities[0];
  enquiry.is_converted_to_facility = true;
  enquiry.converted_facility_id = primaryFacility._id;
  await enquiry.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "enquiry",
    entity_id: enquiry._id,
    entity_name: enquiry.name,
    message: `${user?.name || "User"} linked enquiry "${enquiry.name}" to new facility`,
    meta: {
      enquiry_id: enquiry._id?.toString(),
      facility_id: primaryFacility._id?.toString(),
    },
  });

  return primaryFacility;
};

export const getFacilitiesService = async (user) => {
  let facilities = [];

  if (user?.role === "super_admin") {
    facilities = await Facility.find().sort({ start_date: -1, createdAt: -1 });
  } else {
    const assignedFacilityIds = await FacilityAuditor.find({
      user_id: user._id,
    }).distinct("facility_id");

    facilities = await Facility.find({
      $or: [
        { owner_user_id: user._id },
        { _id: { $in: assignedFacilityIds } },
      ],
    }).sort({ start_date: -1, createdAt: -1 });
  }

  const facilityIds = facilities.map((f) => f._id);
  const allAssignments = await FacilityAuditor.find({
    facility_id: { $in: facilityIds },
  })
    .populate("user_id", "name email")
    .lean();

  const assignmentsByFacility = {};
  allAssignments.forEach((assign) => {
    const fid = String(assign.facility_id);
    if (!assignmentsByFacility[fid]) {
      assignmentsByFacility[fid] = [];
    }
    assignmentsByFacility[fid].push({
      _id: String(assign._id),
      user_id: assign.user_id,
      assigned_role: assign.assigned_role,
    });
  });

  return facilities.map((facility) => {
    const facilityObj = facility.toObject();
    facilityObj.assignedAuditors = assignmentsByFacility[String(facility._id)] || [];
    return facilityObj;
  });
};

const parseFacilityIdsParam = (raw) => {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw.map(String).filter(Boolean);
  }
  return String(raw)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
};

const resolveAccessibleFacilityIds = async (user) => {
  if (user?.role === "super_admin") {
    const facilities = await Facility.find({}, "_id").lean();
    return facilities.map((facility) => String(facility._id));
  }

  const assignedFacilityIds = await FacilityAuditor.find({
    user_id: user._id,
  }).distinct("facility_id");

  const ownedFacilities = await Facility.find(
    { owner_user_id: user._id },
    "_id",
  ).lean();

  const ids = [
    ...ownedFacilities.map((facility) => String(facility._id)),
    ...assignedFacilityIds.map(String),
  ];

  return [...new Set(ids)];
};

export const getFacilitiesUtilityProgressService = async (user, rawFacilityIds) => {
  const requestedIds = parseFacilityIdsParam(rawFacilityIds).slice(0, 20);
  if (!requestedIds.length) {
    return {};
  }

  const accessibleIds = await resolveAccessibleFacilityIds(user);
  const scopedIds = isAdmin(user)
    ? requestedIds
    : requestedIds.filter((id) => accessibleIds.includes(String(id)));

  if (!scopedIds.length) {
    return {};
  }

  const facilities = await Facility.find({ _id: { $in: scopedIds } })
    .select("_id audit_type")
    .lean();
  const utilities = await UtilityAccount.find({
    facility_id: { $in: scopedIds },
  }).lean();

  return buildUtilityProgressMapForFacilities(facilities, utilities);
};

export const getFacilityByIdService = async (user, facilityId) => {
  const facility = await resolveAccessibleFacility(user, facilityId);

  if (!facility) {
    const error = new Error("Facility not found");
    error.statusCode = 404;
    throw error;
  }

  await facility.populate([
    { path: "audit_closure.closed_by", select: "name email" },
    { path: "audit_closure.reopened_by", select: "name email" },
  ]);

  const assignedAuditors = await FacilityAuditor.find({
    facility_id: facility._id,
  })
    .populate("user_id", "name email")
    .select("user_id assigned_by createdAt");

  return {
    facility,
    assignedAuditors,
  };
};

export const updateFacilityService = async ({ user, facilityId, body, files, io }) => {
  const {
    name,
    city,
    address,
    client_representative,
    client_contact_number,
    client_email,
    facility_type,
    audit_type,
    status,
    start_date,
    closure_date,
    auditor_ids,
    client_representatives,
    budget: budgetRaw,
    removed_document_ids,
    enquiry_number,
  } = body;

  const facility = await resolveAccessibleFacility(user, facilityId);

  if (!facility) {
    const error = new Error("Facility not found");
    error.statusCode = 404;
    throw error;
  }

  const parsedAuditorIds = parseAuditorIds(auditor_ids);
  const parsedClientRepresentatives = parseClientRepresentatives(
    client_representatives,
  );
  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "facilities",
    facility._id,
  );

  let captions = [];
  if (body?.captions) {
    try {
      captions =
        typeof body.captions === "string"
          ? JSON.parse(body.captions)
          : body.captions;
    } catch {
      captions = [];
    }
  }

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  const updatedFields = Object.keys(body || {});

  facility.name = name ?? facility.name;
  facility.city = city ?? facility.city;
  facility.address = address ?? facility.address;
  facility.client_representative =
    client_representative ?? facility.client_representative;
  facility.client_contact_number =
    client_contact_number ?? facility.client_contact_number;
  facility.client_email = client_email ?? facility.client_email;
  if (client_representatives !== undefined) {
    facility.client_representatives = parsedClientRepresentatives;
  } else if (
    client_representative !== undefined ||
    client_contact_number !== undefined ||
    client_email !== undefined
  ) {
    const derivedName =
      client_representative ?? facility.client_representative ?? "";
    const derivedContact =
      client_contact_number ?? facility.client_contact_number ?? "";
    const derivedEmail = client_email ?? facility.client_email ?? "";
    facility.client_representatives = [
      {
        name: String(derivedName).trim(),
        contact_number: String(derivedContact).trim(),
        email: String(derivedEmail).trim(),
      },
    ].filter((rep) => rep.name || rep.contact_number || rep.email);
  }
  if (facility_type !== undefined) {
    facility.facility_type = String(facility_type).trim();
  }
  if (audit_type !== undefined) {
    facility.audit_type = audit_type;
  }
  if (enquiry_number !== undefined) {
    facility.enquiry_number = enquiry_number ? String(enquiry_number).trim() : undefined;
  }
  facility.status = status ?? facility.status;
  facility.start_date = start_date ?? facility.start_date;
  facility.closure_date = closure_date ?? facility.closure_date;

  if (budgetRaw !== undefined) {
    const parseNumberOrNull = (v) => {
      const n = Number(v);
      return v !== undefined && v !== null && v !== "" && !isNaN(n) ? n : null;
    };
    const b = typeof budgetRaw === "string" ? JSON.parse(budgetRaw) : budgetRaw;
    facility.budget = {
      no_of_persons: parseNumberOrNull(b?.no_of_persons),
      no_planned_site_visits: parseNumberOrNull(b?.no_planned_site_visits),
      tentative_budget: parseNumberOrNull(b?.tentative_budget),
      actual_budget: parseNumberOrNull(b?.actual_budget),
    };
  }

  let parsedRemovedDocIds = [];
  if (removed_document_ids) {
    try {
      parsedRemovedDocIds = typeof removed_document_ids === "string"
        ? JSON.parse(removed_document_ids)
        : removed_document_ids;
    } catch (e) {
      console.error("Failed to parse removed_document_ids:", e);
    }
  }

  if (Array.isArray(parsedRemovedDocIds) && parsedRemovedDocIds.length > 0) {
    const originalCount = facility.documents.length;
    facility.documents = facility.documents.filter(
      (doc) => !parsedRemovedDocIds.includes(doc._id?.toString()),
    );
    if (facility.documents.length !== originalCount) {
      updatedFields.push("documents");
    }
  }

  if (uploadedDocuments.length > 0) {
    facility.documents = [...(facility.documents || []), ...uploadedDocuments];
    updatedFields.push("documents");
  }

  applyAuditorIdFromBody(facility, user, body);
  if (parsedAuditorIds.length > 0 && !facility.auditor_id) {
    facility.auditor_id = parsedAuditorIds[0];
  }

  const updatedFacility = await facility.save();

  if (auditor_ids !== undefined) {
    await FacilityAuditor.deleteMany({ facility_id: facility._id });

    if (parsedAuditorIds.length > 0) {
      const facilityAuditorDocs = parsedAuditorIds.map((auditorId) => ({
        facility_id: facility._id,
        user_id: auditorId,
        assigned_by: user._id,
      }));

      await FacilityAuditor.insertMany(facilityAuditorDocs, { ordered: false });

      for (const auditorId of parsedAuditorIds) {
        await createNotification(io, {
          recipient: auditorId,
          sender: user._id,
          title: "Facility Assignment Updated",
          message: `You have been assigned to facility: ${facility.name}`,
          type: "facility",
          referenceId: facility._id,
        });
      }
    }

    await createRecentActivity({
      actor: user,
      action: "assigned",
      entity_type: "facility",
      entity_id: facility._id,
      entity_name: facility.name,
      facility_id: facility._id,
      message: `${user?.name || "User"} updated auditors for facility "${facility.name}"`,
      meta: {
        auditor_ids: parsedAuditorIds,
      },
    });
  }

  const assignedAuditors = await FacilityAuditor.find({
    facility_id: facility._id,
  }).select("user_id assigned_by createdAt");

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "facility",
    entity_id: updatedFacility._id,
    entity_name: updatedFacility.name,
    facility_id: updatedFacility._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "facility",
      entityName: updatedFacility.name,
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      status: updatedFacility.status,
    },
  });

  return {
    facility: updatedFacility,
    assignedAuditors,
  };
};

export const deleteFacilityService = async (user, facilityId) => {
  const query = user?.role === "super_admin"
    ? { _id: facilityId }
    : { _id: facilityId, owner_user_id: user._id };

  const facility = await Facility.findOne(query);

  if (!facility) {
    const error = new Error("Facility not found");
    error.statusCode = 404;
    throw error;
  }

  const name = facility.name;
  const city = facility.city;

  await FacilityAuditor.deleteMany({ facility_id: facility._id });
  await facility.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "facility",
    entity_id: facility._id,
    entity_name: name,
    facility_id: facility._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "facility",
      entityName: name,
    }),
    meta: {
      city,
    },
  });

  return true;
};


