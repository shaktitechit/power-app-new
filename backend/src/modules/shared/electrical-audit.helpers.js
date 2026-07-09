import mongoose from "mongoose";
import { AsyncLocalStorage } from "async_hooks";
import { modelsRegistry } from "../../data/modelRegistry.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import { rolePolicies } from "../../policies/rolePolicies.js";
import { onlineUsers } from "../../socket/socketServer.js";
import {
  API_PUBLIC_BASE_URL,
  FILE_DOCUMENT_LINKS_RELATIVE,
} from "../../config/fileManagement.js";
import { uploadMulterFile } from "../../services/fileManagement/index.js";

const {
  Facility,
  FacilityAuditor,
  UtilityAccount,
  Notification,
  RecentActivity,
} = modelsRegistry;

// --- File Management Helpers ---
export const FOLDER_TO_RESOURCE_TYPE = {
  "facilities": "facility",
  "utility-accounts": "utility_account",
  "utility-tariffs": "utility_tariff",
  "utility-billing-records": "utility_billing_record",
  "transformers": "transformer",
  "pumps": "pump",
  "dg-sets": "dg_set",
  "solar-plants": "solar_plant",
  "hvac-audits": "hvac_audit",
  "lighting-audits": "lighting_audit",
  "street-light-audits": "street_light_audit",
  "ups-audits": "ups_audit",
  "misc-load-audits": "misc_load_audit",
  "lux-measurements": "lux_measurement",
  "fan-audits": "fan_audit",
  "ac-audits": "ac_audit",
  "dg-audit-records": "dg_audit_record",
  "pump-audit-records": "pump_audit_record",
  "transformer-audit-records": "transformer_audit_record",
  "solar-generation-records": "solar_generation_record",
  "reports/excel": "report",
  "reports/pdf": "report",
  "safety-audits": "safety_audit",
  "enquiries": "enquiry_document",
};

export function buildProxyViewUrl(fileId) {
  const path = `/api/v1/file-management/files/${fileId}/view`;
  if (FILE_DOCUMENT_LINKS_RELATIVE) {
    return path;
  }
  return `${API_PUBLIC_BASE_URL}${path}`;
}

export async function uploadBufferToFileManagement(
  file,
  folderKey = "facilities",
  resourceObjectId,
) {
  const resourceType =
    FOLDER_TO_RESOURCE_TYPE[folderKey] || folderKey || "facility";
  const resourceId = String(resourceObjectId);
  const fileId = await uploadMulterFile(file, resourceType, resourceId);
  return {
    secure_url: buildProxyViewUrl(fileId),
    public_id: fileId,
  };
}

// Shared file uploader
export const uploadAuditDocuments = async (files = [], folderName, recordId) => {
  const docs = [];

  if (!Array.isArray(files) || files.length === 0) {
    return docs;
  }

  for (const file of files) {
    if (!file) continue;

    const uploaded = await uploadBufferToFileManagement(
      file,
      folderName,
      recordId,
    );

    docs.push({
      fileUrl: uploaded.secure_url,
      fileType: file.mimetype === "application/pdf" ? "pdf" : "image",
      fileName: file.originalname,
    });
  }

  return docs;
};

// --- Parsers & Formatters ---
export const parseNumber = (value) => {
  if (value === undefined || value === null || value === "") return undefined;
  return Number(value);
};

export const formatDateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
};

export const buildTariffEntityName = (effectiveFrom, accountNumber) => {
  const dateLabel = formatDateLabel(effectiveFrom);
  if (accountNumber && dateLabel) {
    return `Tariff ${dateLabel} (${accountNumber})`;
  }
  if (dateLabel) return `Tariff ${dateLabel}`;
  if (accountNumber) return `Tariff (${accountNumber})`;
  return "Tariff";
};

export const parseAuditorIds = (auditor_ids) => {
  let parsedAuditorIds = [];

  if (auditor_ids) {
    if (Array.isArray(auditor_ids)) {
      parsedAuditorIds = auditor_ids;
    } else {
      try {
        parsedAuditorIds = JSON.parse(auditor_ids);
      } catch {
        parsedAuditorIds = [auditor_ids];
      }
    }
  }

  return [...new Set(parsedAuditorIds.map(id => String(id).trim()).filter(Boolean))];
};

/** Resolve auditor_id from request body or fall back to the authenticated user. */
export const resolveAuditorId = (user, source) => {
  if (source && typeof source === "object" && "auditor_id" in source) {
    const value = source.auditor_id;
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  } else if (typeof source === "string" && source.trim()) {
    return source.trim();
  }
  return user?._id ?? undefined;
};

/** Persist auditor_id on create/update; keeps existing value when body omits it. */
export const applyAuditorIdFromBody = (record, user, body = {}) => {
  if (!record) return;
  if (Object.prototype.hasOwnProperty.call(body, "auditor_id")) {
    record.auditor_id = body.auditor_id || resolveAuditorId(user, body);
    return;
  }
  if (!record.auditor_id) {
    record.auditor_id = resolveAuditorId(user, body);
  }
};

export const parseClientRepresentatives = (client_representatives) => {
  if (!client_representatives) return [];

  let parsed = [];
  if (Array.isArray(client_representatives)) {
    parsed = client_representatives;
  } else {
    try {
      parsed = JSON.parse(client_representatives);
    } catch {
      parsed = [];
    }
  }

  if (!Array.isArray(parsed)) return [];

  return parsed
    .map((rep) => ({
      name: String(rep?.name || "").trim(),
      contact_number: String(rep?.contact_number || "").trim(),
      email: String(rep?.email || "").trim(),
    }))
    .filter((rep) => rep.name || rep.contact_number || rep.email);
};

export const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "")
    return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return Boolean(value);
};

// --- Activity Logging ---
export const requestStore = new AsyncLocalStorage();

export function getModeFromContext() {
  const req = requestStore.getStore();
  return req?.cookies?.mode ?? null;
}

const VALID_MODES = ["onsite", "offsite"];

function resolveMode(explicitMode) {
  if (explicitMode && VALID_MODES.includes(explicitMode)) return explicitMode;
  const cookieMode = getModeFromContext();
  if (cookieMode && VALID_MODES.includes(cookieMode)) return cookieMode;
  return null;
}

export const createRecentActivity = async ({
  actor = null,
  action,
  entity_type,
  entity_id,
  entity_name = "",
  facility_id = null,
  utility_account_id = null,
  message,
  meta = {},
  created_by_system = false,
  mode = undefined,
}) => {
  try {
    if (!action || !entity_type || !entity_id || !message) return null;

    return await RecentActivity.create({
      actor_id: actor?._id || actor?.id || null,
      actor_name: actor?.name || "",
      actor_role: actor?.role || "",
      action,
      entity_type,
      entity_id,
      entity_name,
      facility_id,
      utility_account_id,
      message,
      meta,
      created_by_system,
      mode: resolveMode(mode),
    });
  } catch (error) {
    console.error("Failed to create recent activity:", error.message);
    return null;
  }
};

export const buildActivityMessage = ({
  actorName = "User",
  action,
  entityLabel,
  entityName = "",
}) => {
  const safeEntityName = entityName ? ` "${entityName}"` : "";

  switch (action) {
    case "created":
      return `${actorName} created ${entityLabel}${safeEntityName}`;
    case "updated":
      return `${actorName} updated ${entityLabel}${safeEntityName}`;
    case "deleted":
      return `${actorName} deleted ${entityLabel}${safeEntityName}`;
    case "assigned":
      return `${actorName} assigned ${entityLabel}${safeEntityName}`;
    case "unassigned":
      return `${actorName} unassigned ${entityLabel}${safeEntityName}`;
    case "generated":
      return `${actorName} generated ${entityLabel}${safeEntityName}`;
    case "uploaded":
      return `${actorName} uploaded ${entityLabel}${safeEntityName}`;
    case "status_changed":
      return `${actorName} changed status of ${entityLabel}${safeEntityName}`;
    case "login":
      return `${actorName} logged in`;
    case "logout":
      return `${actorName} logged out`;
    default:
      return `${actorName} performed ${action} on ${entityLabel}${safeEntityName}`;
  }
};

// --- Notifications ---
export const createNotification = async (io, {
  recipient,
  sender = null,
  title,
  message,
  type,
  referenceId = null,
}) => {
  try {
    const notification = await Notification.create({
      recipient,
      sender,
      title,
      message,
      type,
      referenceId,
    });

    if (io) {
      if (recipient) {
        const socketId = onlineUsers.get(String(recipient));
        if (socketId) {
          io.to(socketId).emit("new-notification", notification);
        }
      }
      io.to("super-admins").emit("new-notification", notification);
    }

    return notification;
  } catch (error) {
    console.error("Failed to create notification:", error);
    throw error;
  }
};

// --- Authorization ---
const ACTION_ALIASES = {
  [ACTIONS.EDIT]: ACTIONS.UPDATE,
  [ACTIONS.VIEW_REPORT]: ACTIONS.READ,
  [ACTIONS.GENERATE_REPORT]: ACTIONS.CREATE,
  [ACTIONS.VIEW_DOCUMENT]: ACTIONS.READ,
};

const toIdString = (value) => {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && typeof value.toString === "function") {
    return value.toString();
  }
  return String(value);
};

export function getEffectivePolicies(user) {
  if (!user) return [];
  const role = user.role || "auditor";
  const fromRole = rolePolicies[role] || rolePolicies.auditor || [];
  const custom = Array.isArray(user.permissions) ? user.permissions : [];
  return [...fromRole, ...custom];
}

export function findMatchingPolicies(policies, resource, action) {
  const actionCandidates = [action, ACTION_ALIASES[action]].filter(Boolean);
  return policies.filter((policy) => {
    const resourceMatch =
      policy.resource === "*" || policy.resource === resource;
    const actionMatch =
      policy.actions?.includes("*") ||
      actionCandidates.some((candidate) => policy.actions?.includes(candidate));
    return resourceMatch && actionMatch;
  });
}

export function isAdmin(user) {
  const role = user?.role;
  return role === "super_admin" || role === "admin";
}

function hasWildcardAll(user) {
  const policies = getEffectivePolicies(user);
  return policies.some(
    (p) => p.resource === "*" && p.actions?.includes("*") && p.scope === "all",
  );
}

export function hasPolicyScopeAll(user, resource, action) {
  if (!user) return false;
  if (hasWildcardAll(user)) return true;
  const matches = findMatchingPolicies(
    getEffectivePolicies(user),
    resource,
    action,
  );
  return matches.some((m) => m.scope === "all");
}

export function hasOrgWideFacilityAccess(user) {
  return (
    user?.role === "super_admin" ||
    hasPolicyScopeAll(user, RESOURCES.FACILITY, ACTIONS.READ)
  );
}

export function hasOrgWideUtilityAccountRead(user) {
  return (
    user?.role === "super_admin" ||
    hasPolicyScopeAll(user, RESOURCES.UTILITY_ACCOUNT, ACTIONS.READ)
  );
}

export async function isUserAssignedOrOwnerOfFacility(user, facilityId) {
  if (!user?._id || !facilityId) return false;
  const facility = await Facility.findById(facilityId).select("owner_user_id");
  if (!facility) return false;
  if (facility.owner_user_id?.toString() === user._id.toString()) return true;
  return FacilityAuditor.exists({
    facility_id: facilityId,
    user_id: user._id,
  });
}

async function scopeSatisfied(user, scope, context = {}) {
  if (scope === "all") return true;
  if (scope === "none") return false;

  if (scope === "own") {
    const facilityId = context.facilityId;
    if (facilityId) {
      const facility = await Facility.findById(facilityId).select(
        "owner_user_id",
      );
      return (
        facility &&
        facility.owner_user_id?.toString() === user._id.toString()
      );
    }
    const targetUserId = context.targetUserId;
    if (targetUserId != null) {
      return toIdString(targetUserId) === toIdString(user._id);
    }
    const ownerUserId = context.ownerUserId;
    if (ownerUserId != null) {
      return toIdString(ownerUserId) === toIdString(user._id);
    }
    return false;
  }

  if (scope === "assigned") {
    const facilityId = context.facilityId;
    if (!facilityId) return false;
    return isUserAssignedOrOwnerOfFacility(user, facilityId);
  }

  return false;
}

export async function can(user, resource, action, context = {}) {
  if (!user?._id) return false;
  const policies = getEffectivePolicies(user);
  const matches = findMatchingPolicies(policies, resource, action);
  if (!matches.length) return false;

  for (const policy of matches) {
    if (await scopeSatisfied(user, policy.scope, context)) return true;
  }
  return false;
}

export async function resolveAccessibleFacility(user, facilityId) {
  if (!user?._id || !facilityId) return null;

  if (hasOrgWideFacilityAccess(user)) {
    return Facility.findById(facilityId);
  }

  const owned = await Facility.findOne({
    _id: facilityId,
    owner_user_id: user._id,
  });
  if (owned) return owned;

  const assigned = await FacilityAuditor.exists({
    facility_id: facilityId,
    user_id: user._id,
  });
  if (assigned) return Facility.findById(facilityId);

  return null;
}

export async function resolveAccessibleUtilityAccount(user, utilityAccountId) {
  const utilityAccount = await UtilityAccount.findById(utilityAccountId);
  if (!utilityAccount) return null;

  if (user?.role === "super_admin" || hasOrgWideUtilityAccountRead(user)) {
    return utilityAccount;
  }

  const facility = await Facility.findById(utilityAccount.facility_id);
  if (!facility) return null;

  const ok = await isUserAssignedOrOwnerOfFacility(
    user,
    utilityAccount.facility_id,
  );
  if (ok) return utilityAccount;

  return null;
}

export async function getAccessibleUtilityAccountIds(user) {
  if (user?.role === "super_admin") return null;

  const [ownedFacilities, assignedRows] = await Promise.all([
    Facility.find({ owner_user_id: user._id }).select("_id").lean(),
    FacilityAuditor.find({ user_id: user._id }).select("facility_id").lean(),
  ]);

  const facilityIds = [
    ...ownedFacilities.map((f) => f._id),
    ...assignedRows.map((r) => r.facility_id),
  ];

  if (facilityIds.length === 0) return [];

  const utilities = await UtilityAccount.find({
    facility_id: { $in: facilityIds },
  })
    .select("_id")
    .lean();

  return utilities.map((u) => u._id);
}
