import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { DGAuditRecord, DGSet } = modelsRegistry;

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

//
// 🚀 CREATE DG AUDIT RECORD
//

export const createDGAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    dg_set_id,
    utility_account_id,
    facility_id,

    measured_voltage_LL,
    measured_current_avg,
    measured_kW_output,
    measured_kVA_output,
    power_factor,
    frequency_Hz,
    number_of_phase,

    max_load_observed_kW,
    min_load_observed_kW,
    average_loading_percent,
    load_factor_percent,

    idle_running_observed,
    parallel_operation,

    annual_fuel_consumption_liters,
    units_generated_per_year_kWh,
    total_working_hours_per_year,
    units_generated_per_hour_kWh,
    fuel_consumption_per_hour_liters,

    fuel_consumption_during_test_lph,
    units_generated_during_test_kWh,
    time_duration_of_the_test_hours,
    units_generated_per_hour_kWh_during_test,
    fuel_consumption_per_hour_liters_during_test,
    specific_fuel_consumption_l_per_kWh_during_test,

    specific_fuel_consumption_l_per_kWh,
    manufacturer_sfc_l_per_kWh,
    sfc_deviation_percent,
    sfc_deviation_percent_during_test,

    fuel_cost_rs_per_liter,
    annual_fuel_cost_rs,
    dg_cost_per_kWh_rs,
    grid_cost_per_kWh_rs,

    calculated_efficiency_percent,
    manufacturer_efficiency_percent,
    efficiency_deviation_percent,

    exhaust_temperature_C,
    cooling_water_temperature_C,
    lube_oil_pressure_bar,
    lube_oil_consumption_liters_per_year,

    total_operating_hours,
    hours_since_last_overhaul,

    air_fuel_filter_condition,
    visible_smoke_or_abnormal_vibration,

    remarks,
    audit_date,
    auditor_id,
  } = body;

  if (!dg_set_id || !utility_account_id || !facility_id) {
    // res.status(400);
    throw new Error(
      "dg_set_id, utility_account_id and facility_id are required",
    );
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

  const dgSet = await DGSet.findById(dg_set_id);

  if (!dgSet) {
    { const error = new Error("DG set not found"); error.statusCode = 404; throw error; }
  }

  if (dgSet.utility_account_id.toString() !== utility_account_id.toString()) {
    { const error = new Error("dg_set_id does not belong to the given utility account"); error.statusCode = 400; throw error; }
  }

  if (dgSet.facility_id.toString() !== facility_id.toString()) {
    { const error = new Error("dg_set_id does not belong to the given facility"); error.statusCode = 400; throw error; }
  }

  const dgAuditRecordId = new mongoose.Types.ObjectId();

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
    "dg-audit-records",
    dgAuditRecordId,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  const dgAuditRecord = await DGAuditRecord.create({
    _id: dgAuditRecordId,
    dg_set_id,
    utility_account_id,
    facility_id,

    measured_voltage_LL,
    measured_current_avg,
    measured_kW_output,
    measured_kVA_output,
    power_factor,
    frequency_Hz,
    number_of_phase,

    max_load_observed_kW,
    min_load_observed_kW,
    average_loading_percent,
    load_factor_percent,

    idle_running_observed,
    parallel_operation,

    annual_fuel_consumption_liters,
    units_generated_per_year_kWh,
    total_working_hours_per_year,
    units_generated_per_hour_kWh,
    fuel_consumption_per_hour_liters,

    fuel_consumption_during_test_lph,
    units_generated_during_test_kWh,
    time_duration_of_the_test_hours,
    units_generated_per_hour_kWh_during_test,
    fuel_consumption_per_hour_liters_during_test,
    specific_fuel_consumption_l_per_kWh_during_test,

    specific_fuel_consumption_l_per_kWh,
    manufacturer_sfc_l_per_kWh,
    sfc_deviation_percent,
    sfc_deviation_percent_during_test,

    fuel_cost_rs_per_liter,
    annual_fuel_cost_rs,
    dg_cost_per_kWh_rs,
    grid_cost_per_kWh_rs,

    calculated_efficiency_percent,
    manufacturer_efficiency_percent,
    efficiency_deviation_percent,

    exhaust_temperature_C,
    cooling_water_temperature_C,
    lube_oil_pressure_bar,
    lube_oil_consumption_liters_per_year,

    total_operating_hours,
    hours_since_last_overhaul,

    air_fuel_filter_condition,
    visible_smoke_or_abnormal_vibration,

    remarks,
    audit_date,
    auditor_id: resolveAuditorId(user, body),
    documents: uploadedDocuments,
  });
  const dgDisplayName =
    dgSet.dg_number ||
    dgSet.make_model ||
    dgSet.dg_serial_number ||
    "DG Audit";
  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "dg_set",
    entity_id: dgAuditRecord._id,
    entity_name: dgDisplayName,
    facility_id: dgAuditRecord.facility_id,
    utility_account_id: dgAuditRecord.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "DG audit",
      entityName: dgDisplayName,
    }),
    meta: {
      measured_kW_output: dgAuditRecord.measured_kW_output,
      dg_cost_per_kWh_rs: dgAuditRecord.dg_cost_per_kWh_rs,
    },
  });
  return {
    success: true,
    message: "DG audit record created successfully",
    data: dgAuditRecord,
  };
};

export const getDGAuditRecordsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id, dg_set_id } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;
  if (dg_set_id) query.dg_set_id = dg_set_id;

  let dgAuditRecords;

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

  dgAuditRecords = await DGAuditRecord.find(query)
    .populate("facility_id", "name city")
    .populate(
      "utility_account_id",
      "utility_account_id account_number utility_type",
    )
    .populate("dg_set_id", "dg_number make_model rated_capacity_kVA")
    .populate("auditor_id", "name email")
    .sort({ created_at: -1 });

  return {
    success: true,
    count: dgAuditRecords.length,
    data: dgAuditRecords,
  };
};

export const getDGAuditRecordByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const dgAuditRecord = await DGAuditRecord.findById(id)
    .populate("facility_id", "name city address")
    .populate(
      "utility_account_id",
      "utility_account_id account_number utility_type",
    )
    .populate(
      "dg_set_id",
      "dg_number make_model rated_capacity_kVA rated_active_power_kW",
    )
    .populate("auditor_id", "name email");

  if (!dgAuditRecord) {
    { const error = new Error("DG audit record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    dgAuditRecord.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: dgAuditRecord,
  };
};

export const updateDGAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const dgAuditRecord = await DGAuditRecord.findById(id);

  if (!dgAuditRecord) {
    { const error = new Error("DG audit record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    dgAuditRecord.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  assertAuditRecordMutable({
    record: dgAuditRecord,
    user,
    body,
    operation: "update",
  });

  const targetFacilityId =
    body.facility_id || dgAuditRecord.facility_id.toString();

  const targetUtilityAccountId =
    body.utility_account_id || dgAuditRecord.utility_account_id.toString();

  const targetDGSetId =
    body.dg_set_id || dgAuditRecord.dg_set_id.toString();

  if (body.utility_account_id) {
    const newUtility = await resolveAccessibleUtilityAccount(
      user,
      body.utility_account_id,
    );

    if (!newUtility) {
      { const error = new Error("Access denied for new utility account"); error.statusCode = 403; throw error; }
    }

    if (newUtility.facility_id.toString() !== targetFacilityId.toString()) {
      // res.status(400);
      throw new Error(
        "utility_account_id does not belong to the given facility",
      );
    }
  }

  if (
    body.dg_set_id ||
    body.utility_account_id ||
    body.facility_id
  ) {
    const dgSet = await DGSet.findById(targetDGSetId);

    if (!dgSet) {
      { const error = new Error("DG set not found"); error.statusCode = 404; throw error; }
    }

    if (
      dgSet.utility_account_id.toString() !== targetUtilityAccountId.toString()
    ) {
      { const error = new Error("dg_set_id does not belong to the given utility account"); error.statusCode = 400; throw error; }
    }

    if (dgSet.facility_id.toString() !== targetFacilityId.toString()) {
      { const error = new Error("dg_set_id does not belong to the given facility"); error.statusCode = 400; throw error; }
    }
  }
  const dgSet = await DGSet.findById(targetDGSetId);
  const dgDisplayName =
    dgSet?.dg_number ||
    dgSet?.make_model ||
    dgSet?.dg_serial_number ||
    "DG Audit";

  const { existing_documents: existingDocumentsRaw, ...restBody } = body;

  const updatedFields = Object.keys(restBody || {});

  if (existingDocumentsRaw) {
    try {
      const parsedDocs =
        typeof existingDocumentsRaw === "string"
          ? JSON.parse(existingDocumentsRaw)
          : existingDocumentsRaw;
      dgAuditRecord.documents = parsedDocs;
      updatedFields.push("documents");
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  Object.keys(restBody).forEach((key) => {
    dgAuditRecord[key] = restBody[key] ?? dgAuditRecord[key];
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
    "dg-audit-records",
    dgAuditRecord._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    dgAuditRecord.documents = [
      ...(dgAuditRecord.documents || []),
      ...uploadedDocuments,
    ];
    updatedFields.push("documents");
  }

  applyIsCompletedFromBody(dgAuditRecord, body);
  applyAuditorIdFromBody(dgAuditRecord, user, body);
  const updated = await dgAuditRecord.save();

  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "dg_set",
    entity_id: updated._id,
    entity_name: dgDisplayName,
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "DG audit",
      entityName: dgDisplayName,
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
    },
  });

  return {
    success: true,
    message: "DG audit record updated successfully",
    data: updated,
  };
};

export const uploadDGAuditRecordDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const dgAuditRecord = await DGAuditRecord.findById(id);

  if (!dgAuditRecord) {
    const error = new Error("DG audit record not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    dgAuditRecord.utility_account_id,
  );

  if (!utility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  assertAuditRecordMutable({
    record: dgAuditRecord,
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
    "dg-audit-records",
    dgAuditRecord._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    dgAuditRecord.documents = [
      ...(dgAuditRecord.documents || []),
      ...uploadedDocuments,
    ];
    await dgAuditRecord.save();
  }

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: dgAuditRecord,
  };
};

export const deleteDGAuditRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const dgAuditRecord = await DGAuditRecord.findById(id);

  if (!dgAuditRecord) {
    { const error = new Error("DG audit record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    dgAuditRecord.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }

  assertAuditRecordMutable({
    record: dgAuditRecord,
    user,
    operation: "delete",
  });
  }

  // store before delete
  const dgSet = await DGSet.findById(dgAuditRecord.dg_set_id);
  const name =
    dgSet?.dg_number || dgSet?.make_model || dgSet?.dg_serial_number || "DG Audit";
  const facilityId = dgAuditRecord.facility_id;
  const utilityId = dgAuditRecord.utility_account_id;

  await dgAuditRecord.softDelete();

  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "dg_set",
    entity_id: dgAuditRecord._id,
    entity_name: name,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "DG audit",
      entityName: name,
    }),
  });

  return {
    success: true,
    message: "DG audit record deleted successfully",
  };
};
