import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { ACAuditRecord } = modelsRegistry;

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
  const returnAir = Number(data.return_air_temp_C);
  const supplyAir = Number(data.supply_air_temp_C);
  const measuredPower = Number(data.measured_power_kW);
  const quantity = Number(data.quantity_nos);
  const hoursPerDay = Number(data.operating_hours_per_day);
  const daysPerYear = Number(data.operating_days_per_year);
  const coolingTR = Number(data.cooling_capacity_TR);
  const ratedPower = Number(data.rated_input_power_kW);
  const yearOfInstallation = Number(data.year_of_installation);
  const currentYear = new Date().getFullYear();

  if (!Number.isNaN(returnAir) && !Number.isNaN(supplyAir)) {
    data.airside_delta_T = returnAir - supplyAir;
  }

  if (!Number.isNaN(measuredPower) && !Number.isNaN(quantity)) {
    data.connected_load_kW = measuredPower * quantity;
  }

  if (
    !Number.isNaN(Number(data.connected_load_kW)) &&
    !Number.isNaN(hoursPerDay) &&
    !Number.isNaN(daysPerYear)
  ) {
    data.annual_energy_consumption_kWh =
      Number(data.connected_load_kW) * hoursPerDay * daysPerYear;
  }

  if (
    !Number.isNaN(measuredPower) &&
    !Number.isNaN(coolingTR) &&
    coolingTR > 0
  ) {
    data.specific_power_kW_per_TR = measuredPower / coolingTR;
  }

  if (!Number.isNaN(yearOfInstallation) && yearOfInstallation > 0) {
    data.age_years = currentYear - yearOfInstallation;
  }

  if (
    !Number.isNaN(measuredPower) &&
    !Number.isNaN(ratedPower) &&
    ratedPower > 0
  ) {
    data.loading_factor_percent = (measuredPower / ratedPower) * 100;
  }

  return data;
};

export const createACAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = body;

  if (!facility_id || !utility_account_id) {
    { const error = new Error("facility_id & utility_account_id required"); error.statusCode = 400; throw error; }
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
    { const error = new Error("No access to utility"); error.statusCode = 403; throw error; }
  }

  if (utility.facility_id.toString() !== String(facility_id)) {
    { const error = new Error("Utility does not belong to selected facility"); error.statusCode = 400; throw error; }
  }

  let payload = { ...body };
  payload = computeValues(payload);

  const recordId = new mongoose.Types.ObjectId();
  const docs = await uploadAuditDocuments(files || [], "ac-audits", recordId);

  const record = await ACAuditRecord.create({
    _id: recordId,
    ...payload,
    auditor_id: resolveAuditorId(user, payload),
    documents: docs,
  });

  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "ac_audit",
    entity_id: record._id,
    entity_name: record.equipment_name || "AC Audit",
    facility_id: record.facility_id,
    utility_account_id: record.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "AC audit",
      entityName: record.equipment_name || "",
    }),
    meta: {
      cooling_capacity_TR: record.cooling_capacity_TR,
      measured_power_kW: record.measured_power_kW,
    },
  });

  return {
    success: true,
    data: record,
  };
};

export const getACAuditRecordsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = reqQuery;

  const allowedIds = await getAccessibleUtilityAccountIds(user);

  const query = {};
  if (facility_id) query.facility_id = facility_id;

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

  const records = await ACAuditRecord.find(query)
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email")
    .sort({ createdAt: -1 });

  return {
    success: true,
    count: records.length,
    data: records,
  };
};

export const getACAuditRecordByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await ACAuditRecord.findById(id)
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email");

  if (!record) {
    { const error = new Error("AC audit record not found"); error.statusCode = 404; throw error; }
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

export const updateACAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await ACAuditRecord.findById(id);

  if (!record) {
    { const error = new Error("AC audit record not found"); error.statusCode = 404; throw error; }
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

  const nextFacilityId = body.facility_id || record.facility_id.toString();
  const nextUtilityId =
    body.utility_account_id || record.utility_account_id.toString();

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

  const docs = await uploadAuditDocuments(files || [], "ac-audits", record._id);
  if (docs.length > 0) {
    record.documents.push(...docs);
  }

  applyIsCompletedFromBody(record, body);
  applyAuditorIdFromBody(record, user, body);
  const updated = await record.save();
  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "ac_audit",
    entity_id: updated._id,
    entity_name: updated.equipment_name || "AC Audit",
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "AC audit",
      entityName: updated.equipment_name || "",
    }),
    meta: {
      updated_fields: Object.keys(body || {}),
    },
  });

  return {
    success: true,
    data: updated,
  };
};

export const uploadACAuditRecordDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const record = await ACAuditRecord.findById(id);

  if (!record) {
    const error = new Error("AC audit record not found");
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
    "ac-audits",
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

export const deleteACAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await ACAuditRecord.findById(id);

  if (!record) {
    { const error = new Error("AC audit record not found"); error.statusCode = 404; throw error; }
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

  const name =
    record.equipment_name || record.unit_id || record.area_location || "AC Audit";
  const facilityId = record.facility_id;
  const utilityId = record.utility_account_id;

  await record.softDelete();
  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "ac_audit",
    entity_id: record._id,
    entity_name: name,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "AC audit",
      entityName: name,
    }),
  });

  return {
    success: true,
    message: "AC audit record deleted successfully",
  };
};
