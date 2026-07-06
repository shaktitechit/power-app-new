import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { Pump } = modelsRegistry;

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



// 📂 Upload pump documents
;

// 🔍 Check access to utility account
//
// 🚀 CREATE PUMP
//

export const createPumpService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    facility_id,
    utility_account_id,
    pump_tag_number,
    make_model,
    rated_power_kW_or_HP,
    rated_flow_m3_per_hr,
    rated_head_m,
    rated_speed_RPM,
    number_of_stages,
    year_of_installation,
    audit_date,
    auditor_id,
  } = body;

  if (!facility_id || !utility_account_id || !pump_tag_number) {
    // res.status(400);
    throw new Error(
      "facility_id, utility_account_id and pump_tag_number are required",
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

  const existingPump = await Pump.findOne({
    utility_account_id,
    pump_tag_number,
  });

  if (existingPump) {
    { const error = new Error("Pump tag already exists for this utility account"); error.statusCode = 400; throw error; }
  }

  let captions = [];
  if (body?.captions) {
    try {
      captions =
        typeof body.captions === "string"
          ? JSON.parse(body.captions)
          : body.captions;
    } catch (e) {
      console.error("Failed to parse captions in create:", e);
    }
  }

  const pumpId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(files, "pumps", pumpId);
  const docsWithCaptions = uploadedDocuments.map((doc, idx) => ({
    ...doc,
    caption: captions[idx] || "",
  }));

  const pump = await Pump.create({
    _id: pumpId,
    facility_id,
    utility_account_id,
    pump_tag_number,
    make_model,
    rated_power_kW_or_HP,
    rated_flow_m3_per_hr,
    rated_head_m,
    rated_speed_RPM,
    number_of_stages,
    year_of_installation,
    audit_date,
    auditor_id: resolveAuditorId(user, body),
    documents: docsWithCaptions,
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "pump",
    entity_id: pump._id,
    entity_name: pump.pump_tag_number,
    facility_id: pump.facility_id,
    utility_account_id: pump.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "pump",
      entityName: pump.pump_tag_number || "",
    }),
    meta: {
      rated_power_kW_or_HP: pump.rated_power_kW_or_HP,
      rated_flow_m3_per_hr: pump.rated_flow_m3_per_hr,
      rated_head_m: pump.rated_head_m,
      year_of_installation: pump.year_of_installation,
    },
  });

  return {
    success: true,
    message: "Pump created successfully",
    data: pump,
  };
};

export const getPumpsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;

  let pumps;

  if (isAdmin(user)) {
    pumps = await Pump.find(query)
      .populate("facility_id", "name city")
      .populate(
        "utility_account_id",
        "utility_account_id account_number utility_type",
      )
      .populate("auditor_id", "name email")
      .sort({ created_at: -1 });
  } else {
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

    pumps = await Pump.find(query)
      .populate("facility_id", "name city")
      .populate(
        "utility_account_id",
        "utility_account_id account_number utility_type",
      )
      .populate("auditor_id", "name email")
      .sort({ created_at: -1 });
  }

  return {
    success: true,
    count: pumps.length,
    data: pumps,
  };
};

export const getPumpByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const pump = await Pump.findById(id)
    .populate("facility_id", "name city address")
    .populate(
      "utility_account_id",
      "utility_account_id account_number utility_type",
    )
    .populate("auditor_id", "name email");

  if (!pump) {
    { const error = new Error("Pump not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    pump.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: pump,
  };
};

export const updatePumpService = async ({ user, body, files, reqQuery, id, params }) => {
  const pump = await Pump.findById(id);

  if (!pump) {
    { const error = new Error("Pump not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    pump.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const targetFacilityId = body.facility_id || pump.facility_id.toString();
  const targetUtilityId =
    body.utility_account_id || pump.utility_account_id.toString();

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

  if (body.pump_tag_number) {
    const existingPump = await Pump.findOne({
      utility_account_id: targetUtilityId,
      pump_tag_number: body.pump_tag_number,
      _id: { $ne: pump._id },
    });

    if (existingPump) {
      { const error = new Error("Pump tag already exists for this utility account"); error.statusCode = 400; throw error; }
    }
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
      console.error("Failed to parse captions in update:", e);
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

  const uploadedDocuments = await uploadAuditDocuments(files, "pumps", pump._id);
  const newDocsWithCaptions = uploadedDocuments.map((doc, idx) => ({
    ...doc,
    caption: captions[idx] || "",
  }));

  Object.keys(body).forEach((key) => {
    if (key !== "existing_documents") {
      pump[key] = body[key] ?? pump[key];
    }
  });

  if (body.existing_documents !== undefined) {
    pump.documents = [...existingDocs, ...newDocsWithCaptions];
    updatedFields.push("documents");
  } else if (newDocsWithCaptions.length > 0) {
    pump.documents = [...(pump.documents || []), ...newDocsWithCaptions];
    updatedFields.push("documents");
  }

  applyAuditorIdFromBody(pump, user, body);
  const updatedPump = await pump.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "pump",
    entity_id: updatedPump._id,
    entity_name: updatedPump.pump_tag_number,
    facility_id: updatedPump.facility_id,
    utility_account_id: updatedPump.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "pump",
      entityName: updatedPump.pump_tag_number || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      rated_power_kW_or_HP: updatedPump.rated_power_kW_or_HP,
      rated_flow_m3_per_hr: updatedPump.rated_flow_m3_per_hr,
      rated_head_m: updatedPump.rated_head_m,
      year_of_installation: updatedPump.year_of_installation,
    },
  });

  return {
    success: true,
    message: "Pump updated successfully",
    data: updatedPump,
  };
};

export const deletePumpService = async ({ user, body, files, reqQuery, id, params }) => {
  const pump = await Pump.findById(id);

  if (!pump) {
    { const error = new Error("Pump not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    pump.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const entityName = pump.pump_tag_number || "Pump";
  const facilityId = pump.facility_id;
  const utilityId = pump.utility_account_id;
  const ratedPower = pump.rated_power_kW_or_HP;
  const ratedFlow = pump.rated_flow_m3_per_hr;
  const ratedHead = pump.rated_head_m;

  await pump.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "pump",
    entity_id: pump._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "pump",
      entityName,
    }),
    meta: {
      rated_power_kW_or_HP: ratedPower,
      rated_flow_m3_per_hr: ratedFlow,
      rated_head_m: ratedHead,
    },
  });

  return {
    success: true,
    message: "Pump deleted successfully",
  };
};

export const uploadPumpDocumentsService = async ({ user, body, files, id }) => {
  const pump = await Pump.findById(id);
  if (!pump) {
    const error = new Error("Pump not found");
    error.statusCode = 404;
    throw error;
  }
  const utility = await resolveAccessibleUtilityAccount(user, pump.utility_account_id);
  if (!utility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

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

  const uploadedDocs = await uploadAuditDocuments(files, "pumps", pump._id);
  const docsWithCaptions = uploadedDocs.map((doc, idx) => ({
    ...doc,
    caption: captions[idx] || "",
  }));

  pump.documents = [...(pump.documents || []), ...docsWithCaptions];
  await pump.save();

  return { success: true, documents: pump.documents };
};
