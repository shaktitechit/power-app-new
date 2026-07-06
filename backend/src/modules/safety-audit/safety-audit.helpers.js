import asyncHandler from "../../middlewares/asyncHandler.js";
import mongoose from "mongoose";
import {
  uploadBufferToFileManagement,
  createRecentActivity,
  buildActivityMessage,
  resolveAccessibleFacility,
  resolveAccessibleUtilityAccount,
  getAccessibleUtilityAccountIds,
  resolveAuditorId,
  applyAuditorIdFromBody,
} from "../shared/electrical-audit.helpers.js";
import { applyIsCompletedFromBody } from "../../helpers/parseRequestBoolean.js";

/**
 * Normalize JSON fields that may arrive as strings (e.g. multipart).
 * @param {Record<string, unknown>} body
 */
export function normalizePayload(body) {
  const payload = { ...body };
  if (typeof payload.items === "string" && payload.items.trim()) {
    try {
      payload.items = JSON.parse(payload.items);
    } catch {
      delete payload.items;
    }
  }
  if (payload.audit_date && typeof payload.audit_date === "string") {
    const d = new Date(payload.audit_date);
    if (!Number.isNaN(d.getTime())) payload.audit_date = d;
  }
  return payload;
}

const DEFAULT_SAFETY_AUDIT_FOLDER = "safety-audits";

/**
 * @param {import("multer").File[]} files
 * @param {import("mongoose").Types.ObjectId | string} recordId
 * @param {string} folderKey
 */
async function uploadSafetyAuditDocuments(files = [], recordId, folderKey, captions = []) {
  const uploadedDocuments = [];

  for (let index = 0; index < (files || []).length; index++) {
    const file = files[index];
    if (!file) continue;

    const uploaded = await uploadBufferToFileManagement(
      file,
      folderKey,
      recordId,
    );

    const caption = captions[index] || "";

    uploadedDocuments.push({
      fileUrl: uploaded.secure_url,
      fileType: file.mimetype === "application/pdf" ? "pdf" : "image",
      fileName: file.originalname,
      caption,
    });
  }

  return uploadedDocuments;
}

/**
 * Standard list/detail populates. Only includes `transformer_id` / `dg_set_id` when that path
 * exists on the model (Mongoose strictPopulate rejects unknown paths).
 */
function applySafetyAuditPopulates(Model, query) {
  const paths = Model.schema.paths;
  let q = query
    .populate("facility_id", "name city")
    .populate("utility_account_id", "account_number")
    .populate("auditor_id", "name email");
  if (paths.transformer_id) {
    q = q.populate("transformer_id", "name capacity_kVA");
  }
  if (paths.dg_set_id) {
    q = q.populate("dg_set_id", "name capacity_kVA");
  }
  return q;
}

export function defaultDisplayName(record) {
  return (
    record.name ||
    record.panel_name ||
    record.area_name ||
    record.equipment_name ||
    record.pit_name ||
    record.ups_name ||
    record.ldb_name ||
    record.unit_name ||
    record.elevator_name ||
    record.location ||
    (record.transformer_id ? "Transformer safety audit" : null) ||
    (record.dg_set_id ? "DG safety audit" : null) ||
    "Safety audit"
  );
}

/**
 * @param {import("mongoose").Model} Model
 * @param {{
 *   entityType: string;
 *   entityLabel: string;
 *   getDisplayName?: (record: Record<string, unknown>) => string;
 *   extraQueryKeys?: string[];
 *   documentsFolderKey?: string;
 * }} options
 */
export function createSafetyAuditCrudServices(Model, options) {
  const {
    entityType,
    entityLabel,
    getDisplayName = defaultDisplayName,
    extraQueryKeys = [],
    documentsFolderKey = DEFAULT_SAFETY_AUDIT_FOLDER,
  } = options;

  const buildQueryFromRequest = (user, reqQuery) => {
    const { facility_id, utility_account_id, ...rest } = reqQuery;
    const query = {};
    if (facility_id) query.facility_id = facility_id;
    if (utility_account_id) query.utility_account_id = utility_account_id;
    for (const key of extraQueryKeys) {
      if (rest[key]) query[key] = rest[key];
    }
    return query;
  };

  const createService = async ({ user, body, files }) => {
    const raw = normalizePayload(body || {});
    delete raw.documents;
    const { facility_id, utility_account_id } = raw;

    if (!facility_id || !utility_account_id) {
      const error = new Error("facility_id and utility_account_id are required");
      error.statusCode = 400;
      throw error;
    }

    const facility = await resolveAccessibleFacility(user, facility_id);
    if (!facility) {
      const error = new Error("No access to facility");
      error.statusCode = 403;
      throw error;
    }

    const utility = await resolveAccessibleUtilityAccount(
      user,
      utility_account_id,
    );
    if (!utility) {
      const error = new Error("No access to utility account");
      error.statusCode = 403;
      throw error;
    }

    if (utility.facility_id.toString() !== String(facility_id)) {
      const error = new Error("Utility account does not belong to selected facility");
      error.statusCode = 400;
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
        captions = [];
      }
    }

    const recordId = new mongoose.Types.ObjectId();
    const docs = await uploadSafetyAuditDocuments(
      files || [],
      recordId,
      documentsFolderKey,
      captions,
    );

    const record = new Model({
      _id: recordId,
      ...raw,
      documents: docs,
      auditor_id: resolveAuditorId(user, raw),
    });

    applyIsCompletedFromBody(record, body);
    await record.save();

    await createRecentActivity({
      actor: user,
      action: "created",
      entity_type: entityType,
      entity_id: record._id,
      entity_name: getDisplayName(record),
      facility_id: record.facility_id,
      utility_account_id: record.utility_account_id,
      message: buildActivityMessage({
        actorName: user?.name || "User",
        action: "created",
        entityLabel: entityLabel,
        entityName: getDisplayName(record),
      }),
      meta: { status: record.status },
    });

    return record;
  };

  const getAllService = async ({ user, query: reqQuery }) => {
    const query = buildQueryFromRequest(user, reqQuery);
    const utilityFromQuery = reqQuery.utility_account_id;

    const allowedUtilityIds = await getAccessibleUtilityAccountIds(user);

    if (allowedUtilityIds !== null) {
      if (allowedUtilityIds.length === 0) {
        return [];
      }
      if (utilityFromQuery) {
        const isAllowed = allowedUtilityIds.some(
          (id) => id.toString() === String(utilityFromQuery),
        );
        if (!isAllowed) {
          return [];
        }
      } else {
        query.utility_account_id = { $in: allowedUtilityIds };
      }
    }

    return applySafetyAuditPopulates(
      Model,
      Model.find(query),
    ).sort({ created_at: -1 });
  };

  const getByIdService = async ({ user, id }) => {
    const record = await applySafetyAuditPopulates(
      Model,
      Model.findById(id),
    );

    if (!record) {
      const error = new Error("Record not found");
      error.statusCode = 404;
      throw error;
    }

    const access = await resolveAccessibleUtilityAccount(
      user,
      record.utility_account_id,
    );
    if (!access) {
      const error = new Error("Access denied");
      error.statusCode = 403;
      throw error;
    }

    return record;
  };

  const updateService = async ({ user, id, body, files }) => {
    const record = await Model.findById(id);
    if (!record) {
      const error = new Error("Record not found");
      error.statusCode = 404;
      throw error;
    }

    const existingAccess = await resolveAccessibleUtilityAccount(
      user,
      record.utility_account_id,
    );
    if (!existingAccess) {
      const error = new Error("Access denied");
      error.statusCode = 403;
      throw error;
    }

    const raw = normalizePayload(body || {});
    delete raw.documents;
    const nextFacilityId = raw.facility_id || record.facility_id?.toString();
    const nextUtilityId =
      raw.utility_account_id || record.utility_account_id?.toString();

    if (!nextFacilityId || !nextUtilityId) {
      const error = new Error("facility_id and utility_account_id are required");
      error.statusCode = 400;
      throw error;
    }

    const facility = await resolveAccessibleFacility(user, nextFacilityId);
    if (!facility) {
      const error = new Error("No access to facility");
      error.statusCode = 403;
      throw error;
    }

    const nextUtility = await resolveAccessibleUtilityAccount(
      user,
      nextUtilityId,
    );
    if (!nextUtility) {
      const error = new Error("No access to utility account");
      error.statusCode = 403;
      throw error;
    }

    if (nextUtility.facility_id.toString() !== String(nextFacilityId)) {
      const error = new Error("Utility account does not belong to selected facility");
      error.statusCode = 400;
      throw error;
    }

    const updatedFields = Object.keys(raw);
    const merged = normalizePayload({
      ...record.toObject(),
      ...raw,
    });
    record.set(merged);

    if (body?.existing_documents) {
      try {
        const parsedDocs =
          typeof body.existing_documents === "string"
            ? JSON.parse(body.existing_documents)
            : body.existing_documents;
        record.documents = parsedDocs;
      } catch (e) {
        console.error("Failed to parse existing_documents:", e);
      }
    }

    let captions = [];
    if (body?.captions) {
      try {
        captions =
          typeof body.captions === "string"
            ? JSON.parse(body.captions)
            : body.captions;
      } catch (e) {
        captions = [];
      }
    }

    const newDocs = await uploadSafetyAuditDocuments(
      files || [],
      record._id,
      documentsFolderKey,
      captions,
    );
    if (newDocs.length > 0) {
      record.documents ??= [];
      record.documents.push(...newDocs);
    }

    applyAuditorIdFromBody(record, user, raw);
    applyIsCompletedFromBody(record, body);

    const updated = await record.save();

    await createRecentActivity({
      actor: user,
      action: "updated",
      entity_type: entityType,
      entity_id: updated._id,
      entity_name: getDisplayName(updated),
      facility_id: updated.facility_id,
      utility_account_id: updated.utility_account_id,
      message: buildActivityMessage({
        actorName: user?.name || "User",
        action: "updated",
        entityLabel: entityLabel,
        entityName: getDisplayName(updated),
      }),
      meta: { updated_fields: [...new Set(updatedFields)], status: updated.status },
    });

    return updated;
  };

  const removeService = async ({ user, id }) => {
    const record = await Model.findById(id);
    if (!record) {
      const error = new Error("Record not found");
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

    const name = getDisplayName(record);
    const facilityId = record.facility_id;
    const utilityId = record.utility_account_id;

    await record.softDelete();

    await createRecentActivity({
      actor: user,
      action: "deleted",
      entity_type: entityType,
      entity_id: record._id,
      entity_name: name,
      facility_id: facilityId,
      utility_account_id: utilityId,
      message: buildActivityMessage({
        actorName: user?.name || "User",
        action: "deleted",
        entityLabel: entityLabel,
        entityName: name,
      }),
    });

    return true;
  };

  return { createService, getAllService, getByIdService, updateService, removeService };
}

export function createSafetyAuditCrudController(Model, options) {
  const services = createSafetyAuditCrudServices(Model, options);

  const create = asyncHandler(async (req, res) => {
    const record = await services.createService({
      user: req.user,
      body: req.body,
      files: req.files,
    });
    res.status(201).json({ success: true, data: record });
  });

  const getAll = asyncHandler(async (req, res) => {
    const records = await services.getAllService({
      user: req.user,
      query: req.query,
    });
    res.json({ success: true, count: records.length, data: records });
  });

  const getById = asyncHandler(async (req, res) => {
    const record = await services.getByIdService({
      user: req.user,
      id: req.params.id,
    });
    res.json({ success: true, data: record });
  });

  const update = asyncHandler(async (req, res) => {
    const updated = await services.updateService({
      user: req.user,
      id: req.params.id,
      body: req.body,
      files: req.files,
    });
    res.json({ success: true, data: updated });
  });

  const remove = asyncHandler(async (req, res) => {
    await services.removeService({
      user: req.user,
      id: req.params.id,
    });
    res.json({ success: true, message: "Deleted successfully" });
  });

  return { create, getAll, getById, update, remove };
}
