import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { PumpAuditRecord, Pump } = modelsRegistry;

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



// 📂 Upload audit documents
;

// 🔍 Check access to pump
const getAccessiblePump = async (user, pumpId) => {
  const pump = await Pump.findById(pumpId);

  if (!pump) return null;

  const utility = await resolveAccessibleUtilityAccount(
    user,
    pump.utility_account_id,
  );

  if (!utility) return null;

  return pump;
};

//
// 🚀 CREATE PUMP AUDIT RECORD
//

export const createPumpAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    pump_id,
    utility_account_id,
    facility_id,
    suction_head_m,
    discharge_static_head_m,
    delivery_pipe_diameter_inches,
    tank_or_sump_capacity,
    time_to_fill_tank_minutes,
    actual_flow_m3_per_hr,
    voltage_V,
    current_A,
    power_factor,
    input_power_kW,
    operating_hours_per_day,
    daily_energy_consumption_kWh,
    total_dynamic_head_m,
    hydraulic_output_power_kW,
    overall_pump_set_efficiency_percent,
    motor_loading_percent,
    specific_energy_consumption_kWh_per_m3,
    annual_energy_consumption_kWh,
    control_valve_throttling,
    vfd_installed,
    pump_condition,
    leakages_observed,
    recommendations,
    audit_date,
    auditor_id,
  } = body;

  if (!pump_id || !utility_account_id || !facility_id) {
    { const error = new Error("pump_id, utility_account_id and facility_id are required"); error.statusCode = 400; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  if (utility.facility_id.toString() !== facility_id.toString()) {
    { const error = new Error("utility_account_id does not belong to the given facility"); error.statusCode = 400; throw error; }
  }

  const pump = await getAccessiblePump(user, pump_id);

  if (!pump) {
    { const error = new Error("Pump not found or access denied"); error.statusCode = 404; throw error; }
  }

  if (pump.utility_account_id.toString() !== utility_account_id.toString()) {
    { const error = new Error("pump_id does not belong to the given utility_account_id"); error.statusCode = 400; throw error; }
  }

  if (pump.facility_id.toString() !== facility_id.toString()) {
    { const error = new Error("pump_id does not belong to the given facility_id"); error.statusCode = 400; throw error; }
  }

  let captions = [];
  if (body?.captions) {
    try {
      captions =
        typeof body.captions === "string"
          ? JSON.parse(body.captions)
          : body.captions;
    } catch (e) {
      console.error("Failed to parse captions in create audit:", e);
    }
  }

  const pumpAuditRecordId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "pump-audits",
    pumpAuditRecordId,
  );
  const docsWithCaptions = uploadedDocuments.map((doc, idx) => ({
    ...doc,
    caption: captions[idx] || "",
  }));

  const pumpAuditRecord = await PumpAuditRecord.create({
    _id: pumpAuditRecordId,
    pump_id,
    utility_account_id,
    facility_id,
    suction_head_m,
    discharge_static_head_m,
    delivery_pipe_diameter_inches,
    tank_or_sump_capacity,
    time_to_fill_tank_minutes,
    actual_flow_m3_per_hr,
    voltage_V,
    current_A,
    power_factor,
    input_power_kW,
    operating_hours_per_day,
    daily_energy_consumption_kWh,
    total_dynamic_head_m,
    hydraulic_output_power_kW,
    overall_pump_set_efficiency_percent,
    motor_loading_percent,
    specific_energy_consumption_kWh_per_m3,
    annual_energy_consumption_kWh,
    control_valve_throttling,
    vfd_installed,
    pump_condition,
    leakages_observed,
    recommendations,
    documents: docsWithCaptions,
    audit_date,
    auditor_id: resolveAuditorId(user, body),
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "pump_audit",
    entity_id: pumpAuditRecord._id,
    entity_name: pump.pump_tag_number || "Pump Audit",
    facility_id: pumpAuditRecord.facility_id,
    utility_account_id: pumpAuditRecord.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "pump audit",
      entityName: pump.pump_tag_number || "",
    }),
    meta: {
      pump_tag_number: pump.pump_tag_number || "",
      actual_flow_m3_per_hr: pumpAuditRecord.actual_flow_m3_per_hr,
      input_power_kW: pumpAuditRecord.input_power_kW,
      overall_pump_set_efficiency_percent:
        pumpAuditRecord.overall_pump_set_efficiency_percent,
    },
  });

  return {
    success: true,
    message: "Pump audit record created successfully",
    data: pumpAuditRecord,
  };
};

export const getPumpAuditRecordsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id, pump_id } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;
  if (pump_id) query.pump_id = pump_id;

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

  records = await PumpAuditRecord.find(query)
    .populate("facility_id", "name city")
    .populate(
      "utility_account_id",
      "utility_account_id account_number connection_type category",
    )
    .populate("pump_id", "pump_tag_number make_model rated_power_kW_or_HP")
    .populate("auditor_id", "name email")
    .sort({ created_at: -1 });

  return {
    success: true,
    count: records.length,
    data: records,
  };
};

export const getPumpAuditRecordByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await PumpAuditRecord.findById(id)
    .populate("facility_id", "name city address")
    .populate(
      "utility_account_id",
      "utility_account_id account_number connection_type category",
    )
    .populate(
      "pump_id",
      "pump_tag_number make_model rated_power_kW_or_HP rated_flow_m3_per_hr rated_head_m",
    )
    .populate("auditor_id", "name email");

  if (!record) {
    { const error = new Error("Pump audit record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    record.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: record,
  };
};

export const updatePumpAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await PumpAuditRecord.findById(id);

  if (!record) {
    { const error = new Error("Pump audit record not found"); error.statusCode = 404; throw error; }
  }

  const currentUtility = await resolveAccessibleUtilityAccount(
    user,
    record.utility_account_id,
  );

  if (!currentUtility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const targetFacilityId =
    body.facility_id || record.facility_id.toString();
  const targetUtilityId =
    body.utility_account_id || record.utility_account_id.toString();
  const targetPumpId = body.pump_id || record.pump_id.toString();

  const newUtility = await resolveAccessibleUtilityAccount(
    user,
    targetUtilityId,
  );

  if (!newUtility) {
    { const error = new Error("Access denied for selected utility account"); error.statusCode = 403; throw error; }
  }

  if (newUtility.facility_id.toString() !== targetFacilityId.toString()) {
    { const error = new Error("utility_account_id does not belong to the given facility"); error.statusCode = 400; throw error; }
  }

  const newPump = await getAccessiblePump(user, targetPumpId);

  if (!newPump) {
    { const error = new Error("Pump not found or access denied"); error.statusCode = 404; throw error; }
  }

  if (newPump.utility_account_id.toString() !== targetUtilityId.toString()) {
    { const error = new Error("pump_id does not belong to the given utility_account_id"); error.statusCode = 400; throw error; }
  }

  if (newPump.facility_id.toString() !== targetFacilityId.toString()) {
    { const error = new Error("pump_id does not belong to the given facility_id"); error.statusCode = 400; throw error; }
  }

  const updatedFields = Object.keys(body || {});

  let captions = [];
  if (body?.captions) {
    try {
      captions =
        typeof body.captions === "string"
          ? JSON.parse(body.captions)
          : body.captions;
    } catch (e) {
      console.error("Failed to parse captions in update audit:", e);
    }
  }

  let existingDocs = [];
  if (body.existing_documents) {
    try {
      existingDocs =
        typeof body.existing_documents === "string"
          ? JSON.parse(body.existing_documents)
          : body.existing_documents;
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  const uploadedDocuments = await uploadAuditDocuments(
    files,
    "pump-audits",
    record._id,
  );
  const newDocsWithCaptions = uploadedDocuments.map((doc, idx) => ({
    ...doc,
    caption: captions[idx] || "",
  }));

  Object.keys(body).forEach((key) => {
    if (key !== "existing_documents") {
      record[key] = body[key] ?? record[key];
    }
  });

  if (body.existing_documents !== undefined) {
    record.documents = [...existingDocs, ...newDocsWithCaptions];
    updatedFields.push("documents");
  } else if (newDocsWithCaptions.length > 0) {
    record.documents = [...(record.documents || []), ...newDocsWithCaptions];
    updatedFields.push("documents");
  }

  applyIsCompletedFromBody(record, body);
  applyAuditorIdFromBody(record, user, body);
  const updatedRecord = await record.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "pump_audit",
    entity_id: updatedRecord._id,
    entity_name: newPump.pump_tag_number || "Pump Audit",
    facility_id: updatedRecord.facility_id,
    utility_account_id: updatedRecord.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "pump audit",
      entityName: newPump.pump_tag_number || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      actual_flow_m3_per_hr: updatedRecord.actual_flow_m3_per_hr,
      input_power_kW: updatedRecord.input_power_kW,
      overall_pump_set_efficiency_percent:
        updatedRecord.overall_pump_set_efficiency_percent,
    },
  });

  return {
    success: true,
    message: "Pump audit record updated successfully",
    data: updatedRecord,
  };
};

export const deletePumpAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const record = await PumpAuditRecord.findById(id);

  if (!record) {
    { const error = new Error("Pump audit record not found"); error.statusCode = 404; throw error; }
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

  assertAuditRecordMutable({
    record: record,
    user,
    body,
    operation: "update",
  });

  const pump = await Pump.findById(record.pump_id);

  const entityName = pump?.pump_tag_number || "Pump Audit";
  const facilityId = record.facility_id;
  const utilityId = record.utility_account_id;

  await record.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "pump_audit",
    entity_id: record._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "pump audit",
      entityName,
    }),
  });

  return {
    success: true,
    message: "Pump audit record deleted successfully",
  };
};

export const uploadPumpAuditRecordDocumentsService = async ({ user, body, files, id }) => {
  const record = await PumpAuditRecord.findById(id);
  if (!record) {
    const error = new Error("Pump audit record not found");
    error.statusCode = 404;
    throw error;
  }
  const utility = await resolveAccessibleUtilityAccount(user, record.utility_account_id);
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
    } catch (e) {
      console.error("Failed to parse captions:", e);
    }
  }

  const uploadedDocs = await uploadAuditDocuments(files, "pump-audits", record._id);
  const docsWithCaptions = uploadedDocs.map((doc, idx) => ({
    ...doc,
    caption: captions[idx] || "",
  }));

  record.documents = [...(record.documents || []), ...docsWithCaptions];
  await record.save();

  return { success: true, documents: record.documents };
};
