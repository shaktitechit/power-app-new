import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { MiscLoadAuditRecord } = modelsRegistry;

import {
  buildActivityMessage,
  createRecentActivity,
  getAccessibleUtilityAccountIds,
  isAdmin,
  resolveAccessibleFacility,
  resolveAccessibleUtilityAccount,
  uploadAuditDocuments,
  resolveAuditorId,
  applyAuditorIdFromBody,
} from "../../shared/electrical-audit.helpers.js";

import { applyIsCompletedFromBody } from "../../../helpers/parseRequestBoolean.js";
import { assertAuditRecordMutable } from "../../../helpers/auditRecordCompletenessGuard.js";



// 📂 Upload documents
;

// ✅ Auto calculation
const computeValues = (data) => {
  const quantity = Number(data.quantity) || 0;
  const ratedPower = Number(data.rated_power_kW) || 0;
  const avgHours = Number(data.average_operating_hours_per_day) || 0;
  const operatingDays = Number(data.operating_days_per_year) || 0;
  const loadFactorPercent = Number(data.load_factor_percent);

  const loadFactor =
    !Number.isNaN(loadFactorPercent) && loadFactorPercent >= 0
      ? loadFactorPercent / 100
      : 1;

  data.estimated_annual_energy_kWh =
    quantity * ratedPower * avgHours * operatingDays * loadFactor;

  return data;
};

//
// 🚀 CREATE
//

export const createMiscLoadAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = body;

  if (!facility_id || !utility_account_id) {
    { const error = new Error("facility_id & utility_account_id required"); error.statusCode = 400; throw error; }
  }

  // 🔒 Facility access
  const facility = await resolveAccessibleFacility(user, facility_id);
  if (!facility) {
    { const error = new Error("No access to facility"); error.statusCode = 403; throw error; }
  }

  // 🔒 Utility access
  const utility = await resolveAccessibleUtilityAccount(
    user,
    utility_account_id,
  );

  if (!utility) {
    { const error = new Error("No access to utility"); error.statusCode = 403; throw error; }
  }

  // ⚠️ Utility must belong to selected facility
  if (utility.facility_id.toString() !== facility_id) {
    { const error = new Error("Utility does not belong to selected facility"); error.statusCode = 400; throw error; }
  }

  let payload = { ...body };
  payload = computeValues(payload);

  const recordId = new mongoose.Types.ObjectId();
  const docs = await uploadAuditDocuments(files || [], "misc-load-audits", recordId);

  const record = await MiscLoadAuditRecord.create({
    _id: recordId,
    ...payload,
    auditor_id: resolveAuditorId(user, body),
    documents: docs,
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "misc_load",
    entity_id: record._id,
    entity_name: record.equipment_name || record.category || "Misc Load Audit",
    facility_id: record.facility_id,
    utility_account_id: record.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "misc load audit",
      entityName: record.equipment_name || record.category || "",
    }),
    meta: {
      category: record.category,
      quantity: record.quantity,
      rated_power_kW: record.rated_power_kW,
      estimated_annual_energy_kWh: record.estimated_annual_energy_kWh,
    },
  });

  return {
    success: true,
    data: record,
  };
};

export const getMiscLoadAuditRecordsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id, category } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;
  if (category) query.category = category;

  let records;

  const allowedIds = await getAccessibleUtilityAccountIds(user);

  if (allowedIds === null) {
    if (utility_account_id) query.utility_account_id = utility_account_id;
    if (category) query.category = category;
  } else {
    if (utility_account_id) {
      const isAllowed = allowedIds.some(
        (id) => id.toString() === utility_account_id.toString(),
      );
      if (!isAllowed) return { success: true, count: 0, data: [] };
      query.utility_account_id = utility_account_id;
    } else {
      query.utility_account_id = { $in: allowedIds };
    }
  }

  records = await MiscLoadAuditRecord.find(query)
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email")
    .sort({ created_at: -1 });

  return {
    success: true,
    count: records.length,
    data: records,
  };
};

export const getMiscLoadAuditRecordByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await MiscLoadAuditRecord.findById(id)
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email");

  if (!record) {
    { const error = new Error("Misc load audit record not found"); error.statusCode = 404; throw error; }
  }

  const access = await resolveAccessibleUtilityAccount(
    user,
    record.utility_account_id,
  );

  if (!access) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: record,
  };
};

export const updateMiscLoadAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await MiscLoadAuditRecord.findById(id);

  if (!record) {
    { const error = new Error("Misc load audit record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    record.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  assertAuditRecordMutable({
    record: record,
    user,
    body,
    operation: "update",
  });

  const nextFacilityId = body.facility_id || record.facility_id?.toString();
  const nextUtilityId =
    body.utility_account_id || record.utility_account_id?.toString();

  if (!nextFacilityId || !nextUtilityId) {
    { const error = new Error("facility_id & utility_account_id required"); error.statusCode = 400; throw error; }
  }

  const facility = await resolveAccessibleFacility(user, nextFacilityId);
  if (!facility) {
    { const error = new Error("No access to facility"); error.statusCode = 403; throw error; }
  }

  const nextUtility = await resolveAccessibleUtilityAccount(
    user,
    nextUtilityId,
  );

  if (!nextUtility) {
    { const error = new Error("No access to utility"); error.statusCode = 403; throw error; }
  }

  if (nextUtility.facility_id.toString() !== String(nextFacilityId)) {
    { const error = new Error("Utility does not belong to selected facility"); error.statusCode = 400; throw error; }
  }

  const { existing_documents: existingDocumentsRaw, ...restBody } = body;

  const updatedFields = Object.keys(restBody || {});

  let payload = { ...record.toObject(), ...restBody };
  payload = computeValues(payload);

  if (existingDocumentsRaw) {
    try {
      const parsedDocs =
        typeof existingDocumentsRaw === "string"
          ? JSON.parse(existingDocumentsRaw)
          : existingDocumentsRaw;
      record.documents = parsedDocs;
      updatedFields.push("documents");
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  Object.assign(record, payload);

  const docs = await uploadAuditDocuments(files || [], "misc-load-audits", record._id);

  if (docs.length > 0) {
    record.documents.push(...docs);
    updatedFields.push("documents");
  }

  applyIsCompletedFromBody(record, body);
  applyAuditorIdFromBody(record, user, body);
  const updated = await record.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "misc_load",
    entity_id: updated._id,
    entity_name:
      updated.equipment_name || updated.category || "Misc Load Audit",
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "misc load audit",
      entityName: updated.equipment_name || updated.category || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      estimated_annual_energy_kWh: updated.estimated_annual_energy_kWh,
    },
  });

  return {
    success: true,
    data: updated,
  };
};


export const uploadMiscLoadAuditDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const record = await MiscLoadAuditRecord.findById(id);

  if (!record) {
    const error = new Error("Misc load audit record not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    record.utility_account_id,
  );

  if (!utility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  assertAuditRecordMutable({
    record: record,
    user,
    body,
    operation: "upload",
  });

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

  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "misc-load-audits",
    record._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    record.documents = [...(record.documents || []), ...uploadedDocuments];
    await record.save();
  }

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: record,
  };
};

export const deleteMiscLoadAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await MiscLoadAuditRecord.findById(id);

  if (!record) {
    { const error = new Error("Misc load audit record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    record.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }

  assertAuditRecordMutable({
    record: record,
    user,
    operation: "delete",
  });
  }

  const entityName =
    record.equipment_name || record.category || "Misc Load Audit";
  const facilityId = record.facility_id;
  const utilityId = record.utility_account_id;

  await record.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "misc_load",
    entity_id: record._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "misc load audit",
      entityName,
    }),
  });

  return {
    success: true,
    message: "Misc load audit record deleted successfully",
  };
};
