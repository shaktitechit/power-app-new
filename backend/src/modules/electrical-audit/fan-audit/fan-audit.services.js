import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { FanAuditRecord } = modelsRegistry;

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



;

const computeValues = (data) => {
  const ratedPower = Number(data.rated_power_W);
  const measuredPower = Number(data.measured_power_W);
  const quantity = Number(data.quantity_nos);
  const hoursPerDay = Number(data.operating_hours_per_day);
  const daysPerYear = Number(data.operating_days_per_year);

  if (
    !Number.isNaN(measuredPower) &&
    !Number.isNaN(ratedPower) &&
    ratedPower > 0
  ) {
    data.loading_factor_percent = (measuredPower / ratedPower) * 100;
  }

  if (!Number.isNaN(measuredPower) && !Number.isNaN(quantity)) {
    data.connected_load_kW = (measuredPower * quantity) / 1000;
  }

  if (
    !Number.isNaN(Number(data.connected_load_kW)) &&
    !Number.isNaN(hoursPerDay) &&
    !Number.isNaN(daysPerYear)
  ) {
    data.annual_energy_consumption_kWh =
      Number(data.connected_load_kW) * hoursPerDay * daysPerYear;
  }

  return data;
};

export const createFanAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = body;

  if (!facility_id || !utility_account_id) {
    { const error = new Error("facility_id and utility_account_id are required"); error.statusCode = 400; throw error; }
  }

  const facility = await resolveAccessibleFacility(user, facility_id);
  if (!facility) {
    { const error = new Error("No access to facility"); error.statusCode = 403; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    utility_account_id,
  );
  if (!utility) {
    { const error = new Error("No access to utility account"); error.statusCode = 403; throw error; }
  }

  if (utility.facility_id.toString() !== String(facility_id)) {
    { const error = new Error("Utility account does not belong to selected facility"); error.statusCode = 400; throw error; }
  }

  let payload = { ...body };
  payload = computeValues(payload);

  const recordId = new mongoose.Types.ObjectId();
  const docs = await uploadAuditDocuments(files || [], "fans", recordId);

  const record = await FanAuditRecord.create({
    _id: recordId,
    ...payload,
    auditor_id: resolveAuditorId(user, payload),
    documents: docs,
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "fan_audit",
    entity_id: record._id,
    entity_name: record.fan_tag_number || record.fan_name || "Fan Audit",
    facility_id: record.facility_id,
    utility_account_id: record.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "fan audit",
      entityName: record.fan_tag_number || record.fan_name || "",
    }),
    meta: {
      rated_power_W: record.rated_power_W,
      measured_power_W: record.measured_power_W,
      quantity_nos: record.quantity_nos,
    },
  });

  return {
    success: true,
    data: record,
  };
};

export const getFanAuditRecordsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = reqQuery;

  const query = {};
  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;

  let records;

  const allowedIds = await getAccessibleUtilityAccountIds(user);

  if (allowedIds === null) {
    if (utility_account_id) query.utility_account_id = utility_account_id;
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

  records = await FanAuditRecord.find(query)
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

export const getFanAuditRecordByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await FanAuditRecord.findById(id)
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email");

  if (!record) {
    { const error = new Error("Fan audit record not found"); error.statusCode = 404; throw error; }
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

export const updateFanAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await FanAuditRecord.findById(id);

  if (!record) {
    { const error = new Error("Fan audit record not found"); error.statusCode = 404; throw error; }
  }

  const existingUtilityAccess = await resolveAccessibleUtilityAccount(
    user,
    record.utility_account_id,
  );

  if (!existingUtilityAccess) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const nextFacilityId = body.facility_id || record.facility_id?.toString();
  const nextUtilityId =
    body.utility_account_id || record.utility_account_id?.toString();

  if (!nextFacilityId || !nextUtilityId) {
    { const error = new Error("facility_id and utility_account_id are required"); error.statusCode = 400; throw error; }
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
    { const error = new Error("No access to utility account"); error.statusCode = 403; throw error; }
  }

  if (nextUtility.facility_id.toString() !== String(nextFacilityId)) {
    { const error = new Error("Utility account does not belong to selected facility"); error.statusCode = 400; throw error; }
  }

  const updatedFields = Object.keys(body || {});

  const { existing_documents: existingDocumentsRaw, ...restBody } = body;

  let payload = {
    ...record.toObject(),
    ...restBody,
  };

  payload = computeValues(payload);

  if (existingDocumentsRaw) {
    try {
      const parsedDocs =
        typeof existingDocumentsRaw === "string"
          ? JSON.parse(existingDocumentsRaw)
          : existingDocumentsRaw;
      record.documents = parsedDocs;
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  Object.assign(record, payload);

  const docs = await uploadAuditDocuments(files || [], "fans", record._id);
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
    entity_type: "fan_audit",
    entity_id: updated._id,
    entity_name: updated.fan_tag_number || updated.fan_name || "Fan Audit",
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "fan audit",
      entityName: updated.fan_tag_number || updated.fan_name || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
    },
  });

  return {
    success: true,
    data: updated,
  };
};


export const uploadFanAuditRecordDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const record = await FanAuditRecord.findById(id);

  if (!record) {
    const error = new Error("Fan audit record not found");
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

  assertAuditRecordMutable({
    record: record,
    user,
    body,
    operation: "update",
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
    "fans",
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

export const deleteFanAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await FanAuditRecord.findById(id);

  if (!record) {
    { const error = new Error("Fan audit record not found"); error.statusCode = 404; throw error; }
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

  const entityName = record.fan_tag_number || record.fan_name || "Fan Audit";
  const facilityId = record.facility_id;
  const utilityId = record.utility_account_id;

  await record.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "fan_audit",
    entity_id: record._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "fan audit",
      entityName: entityName,
    }),
  });

  return {
    success: true,
    message: "Fan audit record deleted successfully",
  };
};
