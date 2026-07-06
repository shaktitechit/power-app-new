import { parseRequestBoolean } from "./parseRequestBoolean.js";

const UNCOMPLETE_ROLES = new Set(["super_admin", "admin", "manager"]);

export function canUncompleteAuditRecord(role) {
  return UNCOMPLETE_ROLES.has(role);
}

const COMPLETENESS_ONLY_KEYS = new Set(["is_completed"]);

function hasNonCompletenessBodyChanges(body = {}) {
  return Object.keys(body).some((key) => {
    if (COMPLETENESS_ONLY_KEYS.has(key)) return false;
    const value = body[key];
    if (value === undefined || value === null || value === "") return false;
    return true;
  });
}

/**
 * Reject mutations on completed audit records unless an authorized user is
 * only setting is_completed back to false.
 */
export function assertAuditRecordMutable({
  record,
  user,
  body = {},
  operation = "update",
}) {
  if (!record?.is_completed) return;

  if (operation === "delete") {
    const error = new Error("Cannot delete a completed audit record");
    error.statusCode = 403;
    throw error;
  }

  if (operation === "upload") {
    const error = new Error("Cannot upload documents to a completed audit record");
    error.statusCode = 403;
    throw error;
  }

  const wantsUncomplete = parseRequestBoolean(body.is_completed) === false;
  const onlyCompletenessChange = !hasNonCompletenessBodyChanges(body);

  if (wantsUncomplete && onlyCompletenessChange) {
    if (!canUncompleteAuditRecord(user?.role)) {
      const error = new Error(
        "Only admin, super admin, or manager can mark a completed record as pending",
      );
      error.statusCode = 403;
      throw error;
    }
    return;
  }

  const error = new Error("Cannot modify a completed audit record");
  error.statusCode = 403;
  throw error;
}
