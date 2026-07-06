import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { LuxMeasurement } = modelsRegistry;

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



// ✅ Auto calculation
const computeValues = (data) => {
  const p1 = Number(data.measured_lux_point_1);
  const p2 = Number(data.measured_lux_point_2);
  const p3 = Number(data.measured_lux_point_3);
  const requiredLux = Number(data.required_lux);

  const validPoints = [p1, p2, p3].filter((value) => !Number.isNaN(value));

  if (validPoints.length > 0) {
    data.average_lux =
      validPoints.reduce((sum, value) => sum + value, 0) / validPoints.length;
  }

  if (!Number.isNaN(requiredLux) && !Number.isNaN(Number(data.average_lux))) {
    data.compliance = Number(data.average_lux) >= requiredLux;
  }

  return data;
};

//
// 🚀 CREATE
//

export const createLuxMeasurementService = async ({ user, body, files, reqQuery, id, params }) => {
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
  const docs = await uploadAuditDocuments(files || [], "lux-measurements", recordId);

  const record = await LuxMeasurement.create({
    _id: recordId,
    ...payload,
    auditor_id: resolveAuditorId(user, body),
    documents: docs,
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "lux_measurement",
    entity_id: record._id,
    entity_name:
      record.area_location || record.task_description || "Lux Measurement",
    facility_id: record.facility_id,
    utility_account_id: record.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "lux measurement",
      entityName: record.area_location || record.task_description || "",
    }),
    meta: {
      required_lux: record.required_lux,
      average_lux: record.average_lux,
      compliance: record.compliance,
    },
  });

  return {
    success: true,
    data: record,
  };
};

export const getLuxMeasurementsService = async ({ user, body, files, reqQuery, id, params }) => {
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

  records = await LuxMeasurement.find(query)
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

export const getLuxMeasurementByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await LuxMeasurement.findById(id)
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email");

  if (!record) {
    { const error = new Error("Lux measurement not found"); error.statusCode = 404; throw error; }
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

export const updateLuxMeasurementService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await LuxMeasurement.findById(id);

  if (!record) {
    { const error = new Error("Lux measurement not found"); error.statusCode = 404; throw error; }
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

  // If utility_account_id is being changed
  if (body.utility_account_id) {
    const newUtility = await resolveAccessibleUtilityAccount(
      user,
      body.utility_account_id,
    );

    if (!newUtility) {
      { const error = new Error("No access to new utility"); error.statusCode = 403; throw error; }
    }

    const facilityIdToCheck =
      body.facility_id || record.facility_id.toString();

    if (newUtility.facility_id.toString() !== facilityIdToCheck) {
      { const error = new Error("Utility does not belong to selected facility"); error.statusCode = 400; throw error; }
    }
  }

  // If facility_id is being changed
  if (body.facility_id) {
    const newFacility = await resolveAccessibleFacility(
      user,
      body.facility_id,
    );

    if (!newFacility) {
      { const error = new Error("No access to new facility"); error.statusCode = 403; throw error; }
    }

    const utilityIdToCheck =
      body.utility_account_id || record.utility_account_id.toString();

    const utilityToCheck = await UtilityAccount.findById(utilityIdToCheck);

    if (!utilityToCheck) {
      { const error = new Error("Utility not found"); error.statusCode = 404; throw error; }
    }

    if (utilityToCheck.facility_id.toString() !== body.facility_id) {
      { const error = new Error("Utility does not belong to selected facility"); error.statusCode = 400; throw error; }
    }
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

  const docs = await uploadAuditDocuments(files || [], "lux-measurements", record._id);

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
    entity_type: "lux_measurement",
    entity_id: updated._id,
    entity_name:
      updated.area_location || updated.task_description || "Lux Measurement",
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "lux measurement",
      entityName: updated.area_location || updated.task_description || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      average_lux: updated.average_lux,
      compliance: updated.compliance,
    },
  });

  return {
    success: true,
    data: updated,
  };
};

export const uploadLuxMeasurementDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const record = await LuxMeasurement.findById(id);

  if (!record) {
    const error = new Error("Lux measurement not found");
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
    "lux-measurements",
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

export const deleteLuxMeasurementService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await LuxMeasurement.findById(id);

  if (!record) {
    { const error = new Error("Lux measurement not found"); error.statusCode = 404; throw error; }
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
    record.area_location || record.task_description || "Lux Measurement";
  const facilityId = record.facility_id;
  const utilityId = record.utility_account_id;

  await record.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "lux_measurement",
    entity_id: record._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "lux measurement",
      entityName,
    }),
  });

  return {
    success: true,
    message: "Lux measurement deleted successfully",
  };
};
