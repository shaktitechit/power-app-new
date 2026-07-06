import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { UPSAudit } = modelsRegistry;

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

// ✅ Auto calculations based on BEE Star / IEC standards
const computeValues = (data) => {
  const inputkW = Number(data.input_active_power_kW);
  const outputkW = Number(data.output_active_power_kW);
  const outputkVA = Number(data.output_apparent_power_kVA);
  const capacitykVA = Number(data.rated_capacity_kVA);
  const capacitykW = Number(data.rated_output_power_kW);
  const hours = Number(data.working_hours_per_day);
  const days = Number(data.working_days_per_year);
  const loadFactor = Number(data.load_factor);
  const nameplateEff100 = Number(data.nameplate_efficiency_100_percent);

  // 1. Measured Efficiency at Actual Load
  if (!Number.isNaN(inputkW) && !Number.isNaN(outputkW) && inputkW > 0) {
    data.measured_efficiency_percent = (outputkW / inputkW) * 100;
  }

  // 2. Loading on kVA basis
  if (!Number.isNaN(outputkVA) && !Number.isNaN(capacitykVA) && capacitykVA > 0) {
    data.loading_kVA_percent = (outputkVA / capacitykVA) * 100;
  }

  // 3. Loading on kW basis
  if (!Number.isNaN(outputkW) && !Number.isNaN(capacitykW) && capacitykW > 0) {
    data.loading_kW_percent = (outputkW / capacitykW) * 100;
  }

  // 4. Annual Energies
  const factor = (!Number.isNaN(loadFactor)) ? loadFactor : 1.0;
  if (!Number.isNaN(inputkW) && !Number.isNaN(hours) && !Number.isNaN(days)) {
    data.annual_input_energy_kWh = inputkW * hours * days * factor;
  }
  if (!Number.isNaN(outputkW) && !Number.isNaN(hours) && !Number.isNaN(days)) {
    data.annual_output_energy_kWh = outputkW * hours * days * factor;
  }

  // 5. Annual Energy Loss
  if (data.annual_input_energy_kWh !== undefined && data.annual_output_energy_kWh !== undefined) {
    data.annual_energy_loss_kWh = data.annual_input_energy_kWh - data.annual_output_energy_kWh;
  }

  // 6. Annual CO2 Emission
  if (data.annual_input_energy_kWh !== undefined) {
    data.annual_co2_emission_t = (data.annual_input_energy_kWh * 0.82) / 1000;
  }

  // 7. Efficiency benchmarking / deviation
  if (data.measured_efficiency_percent !== undefined && !Number.isNaN(nameplateEff100)) {
    data.efficiency_deviation_percentage_points = data.measured_efficiency_percent - nameplateEff100;
  }
  if (!Number.isNaN(inputkW) && !Number.isNaN(outputkW)) {
    data.measured_losses_kW = inputkW - outputkW;
  }

  // 8. Battery System calculations
  const vFloat = Number(data.float_charge_voltage_V);
  const iFloat = Number(data.float_charge_current_A);
  if (!Number.isNaN(vFloat) && !Number.isNaN(iFloat)) {
    data.float_charge_power_W = vFloat * iFloat;
  }

  const vMax = Number(data.cell_voltage_max);
  const vMin = Number(data.cell_voltage_min);
  if (!Number.isNaN(vMax) && !Number.isNaN(vMin)) {
    data.cell_voltage_imbalance_V = vMax - vMin;
  }

  return data;
};

//
// 🚀 CREATE
//

export const createUPSAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
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

  if (utility.facility_id.toString() !== facility_id) {
    { const error = new Error("Utility does not belong to selected facility"); error.statusCode = 400; throw error; }
  }

  let payload = { ...body };
  payload = computeValues(payload);

  const recordId = new mongoose.Types.ObjectId();
  const docs = await uploadAuditDocuments(files || [], "ups-audits", recordId);

  const record = await UPSAudit.create({
    _id: recordId,
    ...payload,
    documents: docs,
    auditor_id: resolveAuditorId(user, body),
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "ups_audit",
    entity_id: record._id,
    entity_name: record.ups_tag_asset_id || record.make_model || "UPS Audit",
    facility_id: record.facility_id,
    utility_account_id: record.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "UPS audit",
      entityName: record.ups_tag_asset_id || record.make_model || "",
    }),
    meta: {
      make_model: record.make_model,
      capacity_kVA: record.rated_capacity_kVA,
      efficiency_percent: record.measured_efficiency_percent,
    },
  });

  return {
    success: true,
    data: record,
  };
};

export const getUPSAuditRecordsService = async ({ user, body, files, reqQuery, id, params }) => {
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

  records = await UPSAudit.find(query)
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

export const getUPSAuditRecordByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await UPSAudit.findById(id)
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email");

  if (!record) {
    { const error = new Error("Not found"); error.statusCode = 404; throw error; }
  }

  const access = await resolveAccessibleUtilityAccount(
    user,
    record.utility_account_id,
  );

  if (!access) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return { success: true, data: record };
};

export const updateUPSAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await UPSAudit.findById(id);

  if (!record) {
    { const error = new Error("Not found"); error.statusCode = 404; throw error; }
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

  const docs = await uploadAuditDocuments(files || [], "ups-audits", record._id);

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
    entity_type: "ups_audit",
    entity_id: updated._id,
    entity_name: updated.ups_tag_asset_id || updated.make_model || "UPS Audit",
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "UPS audit",
      entityName: updated.ups_tag_asset_id || updated.make_model || "",
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

export const uploadUPSAuditDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const record = await UPSAudit.findById(id);

  if (!record) {
    const error = new Error("Not found");
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
    "ups-audits",
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

export const deleteUPSAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await UPSAudit.findById(id);

  if (!record) {
    { const error = new Error("Not found"); error.statusCode = 404; throw error; }
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
    record.ups_tag_asset_id || record.make_model || "UPS Audit";
  const facilityId = record.facility_id;
  const utilityId = record.utility_account_id;

  await record.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "ups_audit",
    entity_id: record._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "UPS audit",
      entityName,
    }),
  });

  return {
    success: true,
    message: "Deleted successfully",
  };
};
