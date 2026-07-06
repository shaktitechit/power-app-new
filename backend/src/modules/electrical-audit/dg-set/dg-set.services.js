import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { DGSet } = modelsRegistry;

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



// 📂 Upload DG set documents
;

//
// 🚀 CREATE DG SET
//

export const createDGSetService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    facility_id,
    utility_account_id,
    dg_number,
    make_model,
    year_of_installation,
    rated_capacity_kVA,
    rated_active_power_kW,
    rated_voltage_V,
    rated_speed_RPM,
    fuel_type,
    audit_date,
    auditor_id,
  } = body;

  if (!facility_id || !utility_account_id || !dg_number) {
    // res.status(400);
    throw new Error(
      "facility_id, utility_account_id and dg_number are required",
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

  const existingDG = await DGSet.findOne({
    utility_account_id,
    dg_number,
  });

  if (existingDG) {
    { const error = new Error("DG number already exists for this utility account"); error.statusCode = 400; throw error; }
  }

  const dgSetId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadAuditDocuments(files, "dg-sets", dgSetId);

  const dgSet = await DGSet.create({
    _id: dgSetId,
    facility_id,
    utility_account_id,
    dg_number,
    make_model,
    year_of_installation,
    rated_capacity_kVA,
    rated_active_power_kW,
    rated_voltage_V,
    rated_speed_RPM,
    fuel_type,
    audit_date,
    auditor_id: resolveAuditorId(user, body),
    documents: uploadedDocuments,
  });
  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "dg_set",
    entity_id: dgSet._id,
    entity_name: dgSet.dg_number,
    facility_id: dgSet.facility_id,
    utility_account_id: dgSet.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "DG set",
      entityName: dgSet.dg_number,
    }),
    meta: {
      make_model: dgSet.make_model,
      rated_capacity_kVA: dgSet.rated_capacity_kVA,
    },
  });

  return {
    success: true,
    message: "DG set created successfully",
    data: dgSet,
  };
};

export const getDGSetsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;

  let dgSets;

  if (isAdmin(user)) {
    dgSets = await DGSet.find(query)
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

    dgSets = await DGSet.find(query)
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
    count: dgSets.length,
    data: dgSets,
  };
};

export const getDGSetByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const dgSet = await DGSet.findById(id)
    .populate("facility_id", "name city address")
    .populate(
      "utility_account_id",
      "utility_account_id account_number utility_type",
    )
    .populate("auditor_id", "name email");

  if (!dgSet) {
    { const error = new Error("DG set not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    dgSet.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: dgSet,
  };
};

export const updateDGSetService = async ({ user, body, files, reqQuery, id, params }) => {
  const dgSet = await DGSet.findById(id);

  if (!dgSet) {
    { const error = new Error("DG set not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    dgSet.utility_account_id,
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
      body.facility_id || dgSet.facility_id.toString();

    if (newUtility.facility_id.toString() !== targetFacilityId.toString()) {
      // res.status(400);
      throw new Error(
        "utility_account_id does not belong to the given facility",
      );
    }
  }

  if (body.dg_number) {
    const existingDG = await DGSet.findOne({
      utility_account_id:
        body.utility_account_id || dgSet.utility_account_id,
      dg_number: body.dg_number,
      _id: { $ne: dgSet._id },
    });

    if (existingDG) {
      { const error = new Error("DG number already exists for this utility account"); error.statusCode = 400; throw error; }
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
      dgSet.documents = parsedDocs;
      updatedFields.push("documents");
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  Object.keys(restBody).forEach((key) => {
    dgSet[key] = restBody[key] ?? dgSet[key];
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
    "dg-sets",
    dgSet._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    dgSet.documents = [...(dgSet.documents || []), ...uploadedDocuments];
    updatedFields.push("documents");
  }

  applyAuditorIdFromBody(dgSet, user, body);
  const updated = await dgSet.save();

  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "dg_set",
    entity_id: updated._id,
    entity_name: updated.dg_number,
    facility_id: updated.facility_id,
    utility_account_id: updated.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "DG set",
      entityName: updated.dg_number,
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
    },
  });

  return {
    success: true,
    message: "DG set updated successfully",
    data: updated,
  };
};

export const uploadDGSetDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const dgSet = await DGSet.findById(id);

  if (!dgSet) {
    const error = new Error("DG set not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    dgSet.utility_account_id,
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
    "dg-sets",
    dgSet._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    dgSet.documents = [...(dgSet.documents || []), ...uploadedDocuments];
    await dgSet.save();
  }

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: dgSet,
  };
};

export const deleteDGSetService = async ({ user, body, files, reqQuery, id, params }) => {
  const dgSet = await DGSet.findById(id);

  if (!dgSet) {
    { const error = new Error("DG set not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    dgSet.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  // store before delete
  const name = dgSet.dg_number;
  const facilityId = dgSet.facility_id;
  const utilityId = dgSet.utility_account_id;

  await dgSet.softDelete();

  // ✅ Recent Activity
  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "dg_set",
    entity_id: dgSet._id,
    entity_name: name,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "DG set",
      entityName: name,
    }),
  });

  return {
    success: true,
    message: "DG set deleted successfully",
  };
};
