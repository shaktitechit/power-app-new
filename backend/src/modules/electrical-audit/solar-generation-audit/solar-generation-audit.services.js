import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SolarGenerationRecord, SolarPlant } = modelsRegistry;

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



// 🔍 Check access to solar plant
const getAccessibleSolarPlant = async (user, solarPlantId) => {
  const solarPlant = await SolarPlant.findById(solarPlantId);

  if (!solarPlant) return null;

  const utility = await resolveAccessibleUtilityAccount(
    user,
    solarPlant.utility_account_id,
  );

  if (!utility) return null;

  return solarPlant;
};

// ♻️ Auto-calculate net values
const calculateNetValues = (data) => {
  const import_kWh = Number(data.import_kWh || 0);
  const import_kVAh = Number(data.import_kVAh || 0);
  const import_kVA = Number(data.import_kVA || 0);

  const export_kWh = Number(data.export_kWh || 0);
  const export_kVAh = Number(data.export_kVAh || 0);
  const export_kVA = Number(data.export_kVA || 0);

  return {
    net_kWh: import_kWh - export_kWh,
    net_kVAh: import_kVAh - export_kVAh,
    net_kVA: import_kVA - export_kVA,
  };
};

//
// 🚀 CREATE
//

export const createSolarGenerationRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    solar_plant_id,
    utility_account_id,
    facility_id,
    billing_period_start,
    billing_period_end,
    billing_days,
    bill_no,
    import_kWh,
    import_kVAh,
    import_kVA,
    export_kWh,
    export_kVAh,
    export_kVA,
    solar_generation_kWh,
    solar_generation_kVAh,
    solar_generation_kVA,
    audit_date,
    auditor_id,
  } = body;

  if (
    !solar_plant_id ||
    !utility_account_id ||
    !facility_id ||
    !billing_period_start ||
    !billing_period_end
  ) {
    // res.status(400);
    throw new Error(
      "solar_plant_id, utility_account_id, facility_id, billing_period_start and billing_period_end are required",
    );
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const solarPlant = await getAccessibleSolarPlant(user, solar_plant_id);

  if (!solarPlant) {
    { const error = new Error("Access denied for solar plant"); error.statusCode = 403; throw error; }
  }

  if (utility.facility_id.toString() !== facility_id.toString()) {
    { const error = new Error("utility_account_id does not belong to the given facility"); error.statusCode = 400; throw error; }
  }

  if (
    solarPlant.utility_account_id.toString() !== utility_account_id.toString()
  ) {
    // res.status(400);
    throw new Error(
      "solar_plant_id does not belong to the given utility_account_id",
    );
  }

  if (solarPlant.facility_id.toString() !== facility_id.toString()) {
    { const error = new Error("solar_plant_id does not belong to the given facility"); error.statusCode = 400; throw error; }
  }

  const existingRecord = await SolarGenerationRecord.findOne({
    solar_plant_id,
    billing_period_start,
    billing_period_end,
  });

  if (existingRecord) {
    // res.status(400);
    throw new Error(
      "A solar generation record already exists for this plant and billing period",
    );
  }

  const recordId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "solar-generation-records",
    recordId,
  );
  const { net_kWh, net_kVAh, net_kVA } = calculateNetValues(body);

  const solarGenerationRecord = await SolarGenerationRecord.create({
    _id: recordId,
    solar_plant_id,
    utility_account_id,
    facility_id,
    billing_period_start,
    billing_period_end,
    billing_days,
    bill_no,
    import_kWh,
    import_kVAh,
    import_kVA,
    export_kWh,
    export_kVAh,
    export_kVA,
    net_kWh,
    net_kVAh,
    net_kVA,
    solar_generation_kWh,
    solar_generation_kVAh,
    solar_generation_kVA,
    audit_date,
    auditor_id: resolveAuditorId(user, body),
    documents: uploadedDocuments,
  });

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "solar_generation",
    entity_id: solarGenerationRecord._id,
    entity_name: solarPlant.plant_name || "Solar Generation",
    facility_id: solarGenerationRecord.facility_id,
    utility_account_id: solarGenerationRecord.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "solar generation record",
      entityName: solarPlant.plant_name || "",
    }),
    meta: {
      solar_generation_kWh: solarGenerationRecord.solar_generation_kWh,
      net_kWh: solarGenerationRecord.net_kWh,
      billing_period_start,
      billing_period_end,
    },
  });

  return {
    success: true,
    message: "Solar generation record created successfully",
    data: solarGenerationRecord,
  };
};

export const getSolarGenerationRecordsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id, solar_plant_id } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;
  if (solar_plant_id) query.solar_plant_id = solar_plant_id;

  let solarGenerationRecords;

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

  solarGenerationRecords = await SolarGenerationRecord.find(query)
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number connection_type")
    .populate("solar_plant_id", "plant_name rating_kWp")
    .populate("auditor_id", "name email")
    .sort({ billing_period_start: -1, created_at: -1 });

  return {
    success: true,
    count: solarGenerationRecords.length,
    data: solarGenerationRecords,
  };
};

export const getSolarGenerationRecordByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const solarGenerationRecord = await SolarGenerationRecord.findById(
    id,
  )
    .populate("facility_id", "name city address")
    .populate("utility_account_id", "account_number connection_type")
    .populate("solar_plant_id", "plant_name rating_kWp")
    .populate("auditor_id", "name email");

  if (!solarGenerationRecord) {
    { const error = new Error("Solar generation record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    solarGenerationRecord.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: solarGenerationRecord,
  };
};

export const updateSolarGenerationRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const solarGenerationRecord = await SolarGenerationRecord.findById(
    id,
  );

  if (!solarGenerationRecord) {
    { const error = new Error("Solar generation record not found"); error.statusCode = 404; throw error; }
  }

  const currentUtility = await resolveAccessibleUtilityAccount(
    user,
    solarGenerationRecord.utility_account_id,
  );

  if (!currentUtility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const targetUtilityId =
    body.utility_account_id || solarGenerationRecord.utility_account_id;
  const targetFacilityId =
    body.facility_id || solarGenerationRecord.facility_id;
  const targetSolarPlantId =
    body.solar_plant_id || solarGenerationRecord.solar_plant_id;

  const targetUtility = await resolveAccessibleUtilityAccount(
    user,
    targetUtilityId,
  );

  if (!targetUtility) {
    { const error = new Error("Access denied for target utility account"); error.statusCode = 403; throw error; }
  }

  const targetSolarPlant = await getAccessibleSolarPlant(
    user,
    targetSolarPlantId,
  );

  if (!targetSolarPlant) {
    { const error = new Error("Access denied for target solar plant"); error.statusCode = 403; throw error; }
  }

  if (targetUtility.facility_id.toString() !== targetFacilityId.toString()) {
    { const error = new Error("utility_account_id does not belong to the given facility"); error.statusCode = 400; throw error; }
  }

  if (
    targetSolarPlant.utility_account_id.toString() !==
    targetUtilityId.toString()
  ) {
    // res.status(400);
    throw new Error(
      "solar_plant_id does not belong to the given utility_account_id",
    );
  }

  if (targetSolarPlant.facility_id.toString() !== targetFacilityId.toString()) {
    { const error = new Error("solar_plant_id does not belong to the given facility"); error.statusCode = 400; throw error; }
  }

  const newBillingPeriodStart =
    body.billing_period_start || solarGenerationRecord.billing_period_start;
  const newBillingPeriodEnd =
    body.billing_period_end || solarGenerationRecord.billing_period_end;

  const duplicateRecord = await SolarGenerationRecord.findOne({
    solar_plant_id: targetSolarPlantId,
    billing_period_start: newBillingPeriodStart,
    billing_period_end: newBillingPeriodEnd,
    _id: { $ne: solarGenerationRecord._id },
  });

  if (duplicateRecord) {
    // res.status(400);
    throw new Error(
      "A solar generation record already exists for this plant and billing period",
    );
  }

  const updatedFields = Object.keys(body || {}).filter(
    (key) => key !== "existing_documents",
  );

  const { existing_documents: existingDocumentsRaw, ...restBody } = body;

  if (existingDocumentsRaw) {
    try {
      const parsedDocs =
        typeof existingDocumentsRaw === "string"
          ? JSON.parse(existingDocumentsRaw)
          : existingDocumentsRaw;
      solarGenerationRecord.documents = parsedDocs;
      updatedFields.push("documents");
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  Object.keys(restBody).forEach((key) => {
    solarGenerationRecord[key] = restBody[key] ?? solarGenerationRecord[key];
  });

  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "solar-generation-records",
    solarGenerationRecord._id,
  );

  const calculated = calculateNetValues({
    import_kWh: body.import_kWh ?? solarGenerationRecord.import_kWh,
    import_kVAh: body.import_kVAh ?? solarGenerationRecord.import_kVAh,
    import_kVA: body.import_kVA ?? solarGenerationRecord.import_kVA,
    export_kWh: body.export_kWh ?? solarGenerationRecord.export_kWh,
    export_kVAh: body.export_kVAh ?? solarGenerationRecord.export_kVAh,
    export_kVA: body.export_kVA ?? solarGenerationRecord.export_kVA,
  });

  solarGenerationRecord.net_kWh = calculated.net_kWh;
  solarGenerationRecord.net_kVAh = calculated.net_kVAh;
  solarGenerationRecord.net_kVA = calculated.net_kVA;

  if (uploadedDocuments.length > 0) {
    solarGenerationRecord.documents = [
      ...(solarGenerationRecord.documents || []),
      ...uploadedDocuments,
    ];
    updatedFields.push("documents");
  }

  applyIsCompletedFromBody(solarGenerationRecord, body);
  applyAuditorIdFromBody(solarGenerationRecord, user, body);
  const updated = await solarGenerationRecord.save();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "solar_generation",
    entity_id: updated._id,
    entity_name: targetSolarPlant?.plant_name || "Solar Generation",
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "solar generation record",
      entityName: targetSolarPlant?.plant_name || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      solar_generation_kWh: updated.solar_generation_kWh,
      net_kWh: updated.net_kWh,
    },
  });

  return {
    success: true,
    message: "Solar generation record updated successfully",
    data: updated,
  };
};

export const deleteSolarGenerationRecordService = async ({ user, body, files, reqQuery, id, params }) => {
  const solarGenerationRecord = await SolarGenerationRecord.findById(
    id,
  );

  if (!solarGenerationRecord) {
    { const error = new Error("Solar generation record not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    solarGenerationRecord.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }

  assertAuditRecordMutable({
    record: solarGenerationRecord,
    user,
    operation: "delete",
  });
  }

  assertAuditRecordMutable({
    record: solarGenerationRecord,
    user,
    body,
    operation: "update",
  });

  const solarPlant = await SolarPlant.findById(
    solarGenerationRecord.solar_plant_id,
  );

  const meta = {
    solar_generation_kWh: solarGenerationRecord.solar_generation_kWh,
    net_kWh: solarGenerationRecord.net_kWh,
  };

  await solarGenerationRecord.softDelete();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "solar_generation",
    entity_id: solarGenerationRecord._id,
    entity_name: solarPlant?.plant_name || "Solar Generation",
    facility_id: solarGenerationRecord.facility_id,
    utility_account_id: solarGenerationRecord.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "solar generation record",
      entityName: solarPlant?.plant_name || "",
    }),
    meta,
  });

  return {
    success: true,
    message: "Solar generation record deleted successfully",
  };
};

export const uploadSolarGenerationRecordDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const solarGenerationRecord = await SolarGenerationRecord.findById(id);

  if (!solarGenerationRecord) {
    const error = new Error("Solar generation record not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    solarGenerationRecord.utility_account_id,
  );

  if (!utility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  assertAuditRecordMutable({
    record: solarGenerationRecord,
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
    "solar-generation-records",
    solarGenerationRecord._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    solarGenerationRecord.documents = [
      ...(solarGenerationRecord.documents || []),
      ...uploadedDocuments,
    ];
    await solarGenerationRecord.save();
  }

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: solarGenerationRecord,
  };
};
