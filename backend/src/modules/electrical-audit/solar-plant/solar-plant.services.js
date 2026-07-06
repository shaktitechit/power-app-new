import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { SolarPlant } = modelsRegistry;

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



//
// 🚀 CREATE SOLAR PLANT
//

export const createSolarPlantService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    facility_id,
    utility_account_id,
    plant_name,
    rating_kWp,
    panel_rating_watt,
    no_of_panels,
    inverter_make,
    inverter_rating_kW,
    audit_date,
    auditor_id,
  } = body;

  if (!facility_id || !utility_account_id) {
    { const error = new Error("facility_id and utility_account_id are required"); error.statusCode = 400; throw error; }
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

  const solarPlantId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "solar-plants",
    solarPlantId,
  );

  const solarPlant = await SolarPlant.create({
    _id: solarPlantId,
    facility_id,
    utility_account_id,
    plant_name,
    rating_kWp,
    panel_rating_watt,
    no_of_panels,
    inverter_make,
    inverter_rating_kW,
    audit_date,
    auditor_id: resolveAuditorId(user, body),
    documents: uploadedDocuments,
  });

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "solar_plant",
    entity_id: solarPlant._id,
    entity_name: solarPlant.plant_name || "Solar Plant",
    facility_id: solarPlant.facility_id,
    utility_account_id: solarPlant.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "solar plant",
      entityName: solarPlant.plant_name || "",
    }),
    meta: {
      rating_kWp: solarPlant.rating_kWp,
      no_of_panels: solarPlant.no_of_panels,
      inverter_rating_kW: solarPlant.inverter_rating_kW,
    },
  });

  return {
    success: true,
    message: "Solar plant created successfully",
    data: solarPlant,
  };
};

export const getSolarPlantsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;

  let solarPlants;

  if (isAdmin(user)) {
    solarPlants = await SolarPlant.find(query)
      .populate("facility_id", "name city")
      .populate("utility_account_id", "account_number utility_type")
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

    solarPlants = await SolarPlant.find(query)
      .populate("facility_id", "name city")
      .populate("utility_account_id", "account_number utility_type")
      .populate("auditor_id", "name email")
      .sort({ created_at: -1 });
  }

  return {
    success: true,
    count: solarPlants.length,
    data: solarPlants,
  };
};

export const getSolarPlantByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const solarPlant = await SolarPlant.findById(id)
    .populate("facility_id", "name city address")
    .populate("utility_account_id", "account_number utility_type")
    .populate("auditor_id", "name email");

  if (!solarPlant) {
    { const error = new Error("Solar plant not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    solarPlant.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: solarPlant,
  };
};

export const updateSolarPlantService = async ({ user, body, files, reqQuery, id, params }) => {
  const solarPlant = await SolarPlant.findById(id);

  if (!solarPlant) {
    { const error = new Error("Solar plant not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    solarPlant.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  if (body.utility_account_id) {
    const newUtility = await resolveAccessibleUtilityAccount(
      user,
      body.utility_account_id,
    );

    if (!newUtility) {
      { const error = new Error("Access denied for new utility account"); error.statusCode = 403; throw error; }
    }

    const targetFacilityId =
      body.facility_id || solarPlant.facility_id.toString();

    if (newUtility.facility_id.toString() !== targetFacilityId.toString()) {
      // res.status(400);
      throw new Error(
        "utility_account_id does not belong to the given facility",
      );
    }
  }

  const { existing_documents: existingDocumentsRaw, ...restBody } = body;

  const updatedFields = Object.keys(restBody || {});

  if (existingDocumentsRaw) {
    try {
      const parsedDocs =
        typeof existingDocumentsRaw === "string"
          ? JSON.parse(existingDocumentsRaw)
          : existingDocumentsRaw;
      solarPlant.documents = parsedDocs;
      updatedFields.push("documents");
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  Object.keys(restBody).forEach((key) => {
    solarPlant[key] = restBody[key] ?? solarPlant[key];
  });

  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "solar-plants",
    solarPlant._id,
  );

  if (uploadedDocuments.length > 0) {
    solarPlant.documents = [
      ...(solarPlant.documents || []),
      ...uploadedDocuments,
    ];
    updatedFields.push("documents");
  }

  applyAuditorIdFromBody(solarPlant, user, body);
  const updated = await solarPlant.save();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "solar_plant",
    entity_id: updated._id,
    entity_name: updated.plant_name || "Solar Plant",
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "solar plant",
      entityName: updated.plant_name || "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      rating_kWp: updated.rating_kWp,
      no_of_panels: updated.no_of_panels,
      inverter_rating_kW: updated.inverter_rating_kW,
    },
  });

  return {
    success: true,
    message: "Solar plant updated successfully",
    data: updated,
  };
};

export const uploadSolarPlantDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const solarPlant = await SolarPlant.findById(id);

  if (!solarPlant) {
    const error = new Error("Solar plant not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    solarPlant.utility_account_id,
  );

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
    } catch {
      captions = [];
    }
  }

  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "solar-plants",
    solarPlant._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    solarPlant.documents = [
      ...(solarPlant.documents || []),
      ...uploadedDocuments,
    ];
    await solarPlant.save();
  }

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: solarPlant,
  };
};

export const deleteSolarPlantService = async ({ user, body, files, reqQuery, id, params }) => {
  const solarPlant = await SolarPlant.findById(id);

  if (!solarPlant) {
    { const error = new Error("Solar plant not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    solarPlant.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const entityName = solarPlant.plant_name || "Solar Plant";
  const facilityId = solarPlant.facility_id;
  const utilityId = solarPlant.utility_account_id;
  const rating = solarPlant.rating_kWp;

  await solarPlant.softDelete();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "solar_plant",
    entity_id: solarPlant._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "solar plant",
      entityName,
    }),
    meta: {
      rating_kWp: rating,
    },
  });

  return {
    success: true,
    message: "Solar plant deleted successfully",
  };
};
