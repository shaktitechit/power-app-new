import mongoose from "mongoose";
import { modelsRegistry } from "../../../data/modelRegistry.js";
const { HVACAudit } = modelsRegistry;

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



// 📂 Upload HVAC audit documents
const uploadHVACDocuments = async (files, hvacAuditId) =>
  uploadAuditDocuments(files, "hvac", hvacAuditId);

// ✅ Convert common string values
const coercePrimitive = (value) => {
  if (value === undefined || value === null) return value;

  if (typeof value !== "string") return value;

  const trimmed = value.trim();

  if (trimmed === "") return "";

  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "null") return null;

  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  return value;
};

// ✅ Safely parse JSON string field
const parseJSONField = (value, fallback) => {
  try {
    if (value === undefined || value === null || value === "") {
      return fallback;
    }

    if (typeof value === "string") {
      return JSON.parse(value);
    }

    return value;
  } catch (error) {
    return fallback;
  }
};

// ✅ Build nested object from bracket-notation keys in multipart body
const extractBracketNotationObject = (body, rootKey) => {
  const result = {};
  const prefix = `${rootKey}[`;

  for (const [key, value] of Object.entries(body || {})) {
    if (!key.startsWith(prefix)) continue;

    const pathMatches = [...key.matchAll(/\[([^\]]*)\]/g)].map(
      (match) => match[1],
    );

    if (pathMatches.length === 0) continue;

    let current = result;

    for (let i = 0; i < pathMatches.length; i++) {
      const segment = pathMatches[i];
      const isLast = i === pathMatches.length - 1;

      if (isLast) {
        current[segment] = coercePrimitive(value);
      } else {
        if (
          !current[segment] ||
          typeof current[segment] !== "object" ||
          Array.isArray(current[segment])
        ) {
          current[segment] = {};
        }
        current = current[segment];
      }
    }
  }

  return result;
};

// ✅ Read either JSON-string field OR bracket-notation multipart field
const getStructuredField = (body, rootKey, fallback) => {
  if (body?.[rootKey] !== undefined) {
    const parsed = parseJSONField(body[rootKey], fallback);
    return parsed ?? fallback;
  }

  const fromBracketNotation = extractBracketNotationObject(body, rootKey);
  if (Object.keys(fromBracketNotation).length > 0) {
    return fromBracketNotation;
  }

  return fallback;
};

// ✅ Check meaningful values
const isMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "string" && value.trim() === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;

  if (typeof value === "object" && !Array.isArray(value)) {
    return Object.values(value).some(isMeaningfulValue);
  }

  return true;
};

// ✅ Remove completely empty objects from array
const removeEmptyObjectsFromArray = (arr = []) => {
  if (!Array.isArray(arr)) return [];

  return arr.filter((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    return Object.values(item).some(isMeaningfulValue);
  });
};

// ✅ Ensure checklist object contains all expected keys
const normalizeDocumentChecklist = (value = {}) => {
  const normalized = {
    single_line_diagram_electrical: {
      available: false,
      remarks: "",
    },
    hvac_layout_piping_drawing: {
      available: false,
      remarks: "",
    },
    chiller_operation_maintenance_log: {
      available: false,
      remarks: "",
    },
    water_treatment_records: {
      available: false,
      remarks: "",
    },
    cooling_tower_maintenance_record: {
      available: false,
      remarks: "",
    },
    hvac_equipment_capacity_list: {
      available: false,
      remarks: "",
    },
    bms_setpoints_schedule: {
      available: false,
      remarks: "",
    },
  };

  for (const key of Object.keys(normalized)) {
    const incoming = value?.[key];

    if (typeof incoming === "boolean") {
      normalized[key] = {
        available: incoming,
        remarks: "",
      };
      continue;
    }

    if (incoming && typeof incoming === "object") {
      normalized[key] = {
        available: Boolean(incoming.available),
        remarks:
          incoming.remarks === undefined || incoming.remarks === null
            ? ""
            : String(incoming.remarks),
      };
    }
  }

  return normalized;
};

// ✅ Normalize HVAC audit payload
const normalizeHVACAuditPayload = (body) => {
  const pre_audit_information = getStructuredField(
    body,
    "pre_audit_information",
    {},
  );

  const documents_records_to_collect = normalizeDocumentChecklist(
    getStructuredField(body, "documents_records_to_collect", {}),
  );

  const hvac_equipment_register = removeEmptyObjectsFromArray(
    getStructuredField(body, "hvac_equipment_register", []),
  );

  const chiller_field_test = getStructuredField(body, "chiller_field_test", {});
  chiller_field_test.readings = removeEmptyObjectsFromArray(
    chiller_field_test.readings || [],
  );
  chiller_field_test.average = chiller_field_test.average || {};

  const auxiliary_power = getStructuredField(body, "auxiliary_power", {});
  auxiliary_power.components = removeEmptyObjectsFromArray(
    auxiliary_power.components || [],
  );

  const cooling_tower_quick_test = getStructuredField(
    body,
    "cooling_tower_quick_test",
    {},
  );
  cooling_tower_quick_test.readings = removeEmptyObjectsFromArray(
    cooling_tower_quick_test.readings || [],
  );
  cooling_tower_quick_test.average = cooling_tower_quick_test.average || {};

  const summary = getStructuredField(body, "summary", {});

  return {
    pre_audit_information,
    documents_records_to_collect,
    hvac_equipment_register,
    chiller_field_test,
    auxiliary_power,
    cooling_tower_quick_test,
    summary,
  };
};

//
// 🚀 CREATE HVAC AUDIT
//

export const createHVACAuditService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id, audit_date, auditor_id } = body;

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

  const {
    pre_audit_information,
    documents_records_to_collect,
    hvac_equipment_register,
    chiller_field_test,
    auxiliary_power,
    cooling_tower_quick_test,
    summary,
  } = normalizeHVACAuditPayload(body);

  const hvacAuditId = new mongoose.Types.ObjectId();
  const uploadedDocuments = await uploadHVACDocuments(
    files || [],
    hvacAuditId,
  );

  const hvacAudit = await HVACAudit.create({
    _id: hvacAuditId,
    facility_id,
    utility_account_id,
    pre_audit_information,
    documents_records_to_collect,
    hvac_equipment_register,
    chiller_field_test,
    auxiliary_power,
    cooling_tower_quick_test,
    summary,
    audit_date,
    auditor_id: resolveAuditorId(user, body),
    documents: uploadedDocuments,
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "hvac_audit",
    entity_id: hvacAudit._id,
    entity_name:
      pre_audit_information?.facility_name ||
      pre_audit_information?.location_address ||
      "HVAC Audit",
    facility_id: hvacAudit.facility_id,
    utility_account_id: hvacAudit.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "created",
      entityLabel: "HVAC audit",
      entityName:
        pre_audit_information?.facility_name ||
        pre_audit_information?.location_address ||
        "",
    }),
    meta: {
      audit_date: hvacAudit.audit_date,
      equipment_count: hvacAudit.hvac_equipment_register?.length || 0,
    },
  });

  return {
    success: true,
    message: "HVAC audit created successfully",
    data: hvacAudit,
  };
};

export const getHVACAuditsService = async ({ user, body, files, reqQuery, id, params }) => {
  const { facility_id, utility_account_id } = reqQuery;

  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;

  let hvacAudits;

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

  hvacAudits = await HVACAudit.find(query)
    .populate("facility_id", "name city")
    .populate(
      "utility_account_id",
      "utility_account_id account_number utility_type",
    )
    .populate("auditor_id", "name email")
    .sort({ createdAt: -1 });

  return {
    success: true,
    count: hvacAudits.length,
    data: hvacAudits,
  };
};

export const getHVACAuditByIdService = async ({ user, body, files, reqQuery, id, params }) => {
  const hvacAudit = await HVACAudit.findById(id)
    .populate("facility_id", "name city address")
    .populate(
      "utility_account_id",
      "utility_account_id account_number utility_type",
    )
    .populate("auditor_id", "name email");

  if (!hvacAudit) {
    { const error = new Error("HVAC audit not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    hvacAudit.utility_account_id._id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  return {
    success: true,
    data: hvacAudit,
  };
};

export const updateHVACAuditService = async ({ user, body, files, reqQuery, id, params }) => {
  const hvacAudit = await HVACAudit.findById(id);

  if (!hvacAudit) {
    { const error = new Error("HVAC audit not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    hvacAudit.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  assertAuditRecordMutable({
    record: hvacAudit,
    user,
    body,
    operation: "update",
  });

  const nextFacilityId =
    body.facility_id || hvacAudit.facility_id.toString();
  const nextUtilityId =
    body.utility_account_id || hvacAudit.utility_account_id.toString();

  const targetUtility = await resolveAccessibleUtilityAccount(
    user,
    nextUtilityId,
  );

  if (!targetUtility) {
    { const error = new Error("Access denied for target utility account"); error.statusCode = 403; throw error; }
  }

  if (targetUtility.facility_id.toString() !== nextFacilityId.toString()) {
    { const error = new Error("utility_account_id does not belong to the given facility"); error.statusCode = 400; throw error; }
  }

  const updatedFields = Object.keys(body || {}).filter(
    (key) => key !== "existing_documents",
  );
  const uploadedDocuments = await uploadHVACDocuments(
    files || [],
    hvacAudit._id,
  );
  const normalized = normalizeHVACAuditPayload(body);

  if (body.existing_documents) {
    try {
      const parsedDocs =
        typeof body.existing_documents === "string"
          ? JSON.parse(body.existing_documents)
          : body.existing_documents;
      hvacAudit.documents = parsedDocs;
      updatedFields.push("documents");
    } catch (e) {
      console.error("Failed to parse existing_documents:", e);
    }
  }

  if (body.facility_id) {
    hvacAudit.facility_id = body.facility_id;
  }

  if (body.utility_account_id) {
    hvacAudit.utility_account_id = body.utility_account_id;
  }

  if (body.audit_date !== undefined) {
    hvacAudit.audit_date = body.audit_date || null;
  }

  applyAuditorIdFromBody(hvacAudit, user, body);

  if (
    body.pre_audit_information !== undefined ||
    Object.keys(extractBracketNotationObject(body, "pre_audit_information"))
      .length > 0
  ) {
    hvacAudit.pre_audit_information = normalized.pre_audit_information;
  }

  if (
    body.documents_records_to_collect !== undefined ||
    Object.keys(
      extractBracketNotationObject(body, "documents_records_to_collect"),
    ).length > 0
  ) {
    hvacAudit.documents_records_to_collect =
      normalized.documents_records_to_collect;
  }

  if (
    body.hvac_equipment_register !== undefined ||
    Object.keys(
      extractBracketNotationObject(body, "hvac_equipment_register"),
    ).length > 0
  ) {
    hvacAudit.hvac_equipment_register = normalized.hvac_equipment_register;
  }

  if (
    body.chiller_field_test !== undefined ||
    Object.keys(extractBracketNotationObject(body, "chiller_field_test"))
      .length > 0
  ) {
    hvacAudit.chiller_field_test = normalized.chiller_field_test;
  }

  if (
    body.auxiliary_power !== undefined ||
    Object.keys(extractBracketNotationObject(body, "auxiliary_power"))
      .length > 0
  ) {
    hvacAudit.auxiliary_power = normalized.auxiliary_power;
  }

  if (
    body.cooling_tower_quick_test !== undefined ||
    Object.keys(
      extractBracketNotationObject(body, "cooling_tower_quick_test"),
    ).length > 0
  ) {
    hvacAudit.cooling_tower_quick_test = normalized.cooling_tower_quick_test;
  }

  if (
    body.summary !== undefined ||
    Object.keys(extractBracketNotationObject(body, "summary")).length > 0
  ) {
    hvacAudit.summary = normalized.summary;
  }

  if (uploadedDocuments.length > 0) {
    hvacAudit.documents = [
      ...(hvacAudit.documents || []),
      ...uploadedDocuments,
    ];
    updatedFields.push("documents");
  }

  applyIsCompletedFromBody(hvacAudit, body);
  const updatedHVACAudit = await hvacAudit.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "hvac_audit",
    entity_id: updatedHVACAudit._id,
    entity_name:
      updatedHVACAudit.pre_audit_information?.facility_name ||
      updatedHVACAudit.pre_audit_information?.location_address ||
      "HVAC Audit",
    facility_id: updatedHVACAudit.facility_id,
    utility_account_id: updatedHVACAudit.utility_account_id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "HVAC audit",
      entityName:
        updatedHVACAudit.pre_audit_information?.facility_name ||
        updatedHVACAudit.pre_audit_information?.location_address ||
        "",
    }),
    meta: {
      updated_fields: [...new Set(updatedFields)],
      audit_date: updatedHVACAudit.audit_date,
    },
  });

  return {
    success: true,
    message: "HVAC audit updated successfully",
    data: updatedHVACAudit,
  };
};

export const uploadHVACAuditDocumentsService = async ({
  user,
  id,
  files,
  body,
}) => {
  const hvacAudit = await HVACAudit.findById(id);

  if (!hvacAudit) {
    const error = new Error("HVAC audit not found");
    error.statusCode = 404;
    throw error;
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    hvacAudit.utility_account_id,
  );

  if (!utility) {
    const error = new Error("Access denied");
    error.statusCode = 403;
    throw error;
  }

  assertAuditRecordMutable({
    record: hvacAudit,
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

  const uploadedDocuments = await uploadHVACDocuments(files, hvacAudit._id);

  uploadedDocuments.forEach((doc, index) => {
    const caption = captions[index];
    if (typeof caption === "string" && caption.trim()) {
      doc.caption = caption.trim();
    }
  });

  if (uploadedDocuments.length > 0) {
    hvacAudit.documents = [
      ...(hvacAudit.documents || []),
      ...uploadedDocuments,
    ];
    await hvacAudit.save();
  }

  return {
    success: true,
    message: "Documents uploaded successfully",
    data: hvacAudit,
  };
};

export const deleteHVACAuditService = async ({ user, body, files, reqQuery, id, params }) => {
  const hvacAudit = await HVACAudit.findById(id);

  if (!hvacAudit) {
    { const error = new Error("HVAC audit not found"); error.statusCode = 404; throw error; }
  }

  const utility = await resolveAccessibleUtilityAccount(
    user,
    hvacAudit.utility_account_id,
  );

  if (!utility) {
    { const error = new Error("Access denied"); error.statusCode = 403; throw error; }
  }

  assertAuditRecordMutable({
    record: hvacAudit,
    user,
    operation: "delete",
  });

  const entityName =
    hvacAudit.pre_audit_information?.facility_name ||
    hvacAudit.pre_audit_information?.location_address ||
    "HVAC Audit";
  const facilityId = hvacAudit.facility_id;
  const utilityId = hvacAudit.utility_account_id;

  await hvacAudit.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "hvac_audit",
    entity_id: hvacAudit._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "deleted",
      entityLabel: "HVAC audit",
      entityName,
    }),
  });

  return {
    success: true,
    message: "HVAC audit deleted successfully",
  };
};
