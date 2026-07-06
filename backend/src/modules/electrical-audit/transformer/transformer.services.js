import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { Transformer } = modelsRegistry;

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



// 📂 Upload transformer documents
;

//
// 🚀 CREATE TRANSFORMER
//

export const createTransformerService = async ({ user, body, files, reqQuery, id, params }) => {
  const {
    facility_id,
    utility_account_id,
    transformer_tag,
    rated_capacity_kVA,
    type_of_cooling,
    rated_HV_kV,
    rated_LV_V,
    rated_HV_current_A,
    rated_LV_current_A,
    no_load_loss_kW,
    full_load_loss_kW,
    nameplate_efficiency_percent,
    audit_date,
    auditor_id,
  } = body;

  if (!facility_id || !utility_account_id || !transformer_tag) {
    // res.status(400);
    throw new Error(
      "facility_id, utility_account_id and transformer_tag are required",
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

  const existingTransformer = await Transformer.findOne({
    utility_account_id,
    transformer_tag,
  });

  if (existingTransformer) {
    { const error = new Error("Transformer tag already exists for this utility account"); error.statusCode = 400; throw error; }
  }

  const transformerId = new mongoose.Types.ObjectId();

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
    "transformers",
    transformerId,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  const transformer = await Transformer.create({
    _id: transformerId,
    facility_id,
    utility_account_id,
    transformer_tag,
    rated_capacity_kVA,
    type_of_cooling,
    rated_HV_kV,
    rated_LV_V,
    rated_HV_current_A,
    rated_LV_current_A,
    no_load_loss_kW,
    full_load_loss_kW,
    nameplate_efficiency_percent,
    audit_date,
    auditor_id: resolveAuditorId(user, body),
    documents: uploadedDocuments,
  });

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "transformer",
    entity_id: transformer._id,
    entity_name: transformer.transformer_tag,
    facility_id: transformer.facility_id,
    utility_account_id: transformer.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "transformer",
      entityName: transformer.transformer_tag,
    }),
    meta: {
      rated_capacity_kVA: transformer.rated_capacity_kVA,
      type_of_cooling: transformer.type_of_cooling,
    },
  });

  return {
    success: true,
    message: "Transformer created successfully",
    data: transformer,
  };
};

export const getTransformersService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;

  let transformers;

  if (isAdmin(user)) {
    transformers = await Transformer.find(query)
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

    transformers = await Transformer.find(query)
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
    count: transformers.length,
    data: transformers,
  };
};

export const getTransformerByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const transformer = await Transformer.findById(id)
    .populate("facility_id", "name city address")
    .populate(
      "utility_account_id",
      "utility_account_id account_number utility_type",
    )
    .populate("auditor_id", "name email");

  if (!transformer) {
    { const error = new Error("Transformer not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    transformer.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: transformer,
  };
};

export const updateTransformerService = async ({ user, body, files, reqQuery, id, params }) => {
  const transformer = await Transformer.findById(id);

  if (!transformer) {
    { const error = new Error("Transformer not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    transformer.utility_account_id,
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
      body.facility_id || transformer.facility_id.toString();

    if (newUtility.facility_id.toString() !== targetFacilityId.toString()) {
      // res.status(400);
      throw new Error(
        "utility_account_id does not belong to the given facility",
      );
    }
  }

  if (body.transformer_tag) {
    const existingTransformer = await Transformer.findOne({
      utility_account_id:
        body.utility_account_id || transformer.utility_account_id,
      transformer_tag: body.transformer_tag,
      _id: { $ne: transformer._id },
    });

    if (existingTransformer) {
      // res.status(400);
      throw new Error(
        "Transformer tag already exists for this utility account",
      );
    }
  }

  const { existing_documents, captions: captionsRaw, ...restBody } = body || {};
  const updatedFields = Object.keys(restBody);

  if (existing_documents) {
    try {
      const parsedDocs =
        typeof existing_documents === "string"
          ? JSON.parse(existing_documents)
          : existing_documents;
      transformer.documents = parsedDocs;
      updatedFields.push("documents");
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  let captions = [];
  if (captionsRaw) {
    try {
      captions =
        typeof captionsRaw === "string"
          ? JSON.parse(captionsRaw)
          : captionsRaw;
    } catch {
      captions = [];
    }
  }

  const uploadedDocuments = await uploadAuditDocuments(
    files || [],
    "transformers",
    transformer._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  Object.keys(restBody).forEach((key) => {
    transformer[key] = restBody[key] ?? transformer[key];
  });

  if (uploadedDocuments.length > 0) {
    transformer.documents = [
      ...(transformer.documents || []),
      ...uploadedDocuments,
    ];
    updatedFields.push("documents");
  }

  applyAuditorIdFromBody(transformer, user, body);
  const updatedTransformer = await transformer.save();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "transformer",
    entity_id: updatedTransformer._id,
    entity_name: updatedTransformer.transformer_tag,
    facility_id: updatedTransformer.facility_id,
    utility_account_id: updatedTransformer.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "transformer",
      entityName: updatedTransformer.transformer_tag,
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      rated_capacity_kVA: updatedTransformer.rated_capacity_kVA,
    },
  });

  return {
    success: true,
    message: "Transformer updated successfully",
    data: updatedTransformer,
  };
};

export const deleteTransformerService = async ({ user, body, files, reqQuery, id, params }) => {
  const transformer = await Transformer.findById(id);

  if (!transformer) {
    { const error = new Error("Transformer not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    transformer.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  const entityName = transformer.transformer_tag;
  const facilityId = transformer.facility_id;
  const utilityId = transformer.utility_account_id;
  const ratedCapacity = transformer.rated_capacity_kVA;

  await transformer.softDelete();

  // ✅ ACTIVITY
  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "transformer",
    entity_id: transformer._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "transformer",
      entityName,
    }),
    meta: {
      rated_capacity_kVA: ratedCapacity,
    },
  });

  return {
    success: true,
    message: "Transformer deleted successfully",
  };
};

export const uploadTransformerDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const transformer = await Transformer.findById(id);

  if (!transformer) {
    const error = new Error("Transformer not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    transformer.utility_account_id,
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
    "transformers",
    transformer._id,
  );

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    transformer.documents = [...(transformer.documents || []), ...uploadedDocuments];
    await transformer.save();
  }

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: transformer,
  };
};
