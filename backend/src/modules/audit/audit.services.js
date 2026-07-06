import mongoose from "mongoose";
import { resolveAccessibleFacility } from "../../services/authorization/index.js";
import {
  aggregateElectricalEnergyAuditForFacility,
  aggregateElectricalSafetyAuditForFacility,
  ELECTRICAL_ENERGY_AUDIT_LABEL,
  ELECTRICAL_SAFETY_AUDIT_LABEL,
} from "../../services/audit/facilityAuditAggregate.js";

// ─── Private helpers ──────────────────────────────────────────────────────────

const throwError = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  throw err;
};

export function parseFacilityId(raw) {
  const id = String(raw || "").trim();
  if (!id) return null;
  if (!mongoose.Types.ObjectId.isValid(id)) return null;
  return id;
}

/**
 * Normalize the `audit_type` query param to one of: "energy" | "safety" | null
 * Accepts a wide range of user-supplied strings.
 */
export function resolveAuditTypeVariant(raw) {
  const t = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  if (
    t === "electrical_energy_audit" ||
    t === "electrical_energy" ||
    t === "energy" ||
    t === "eea"
  ) {
    return "energy";
  }

  if (
    t === "electrical_safety_audit" ||
    t === "electrical_safety" ||
    t === "safety" ||
    t === "esa"
  ) {
    return "safety";
  }

  const compact = t.replace(/_/g, "");
  if (compact === "electricalenergyaudit") return "energy";
  if (compact === "electricalsafetyaudit") return "safety";

  return null;
}

// ─── Services ─────────────────────────────────────────────────────────────────

/**
 * Load and return an audit snapshot for the given user, facility and variant.
 * Throws 404 if the facility cannot be resolved for the user.
 */
export async function getAuditSnapshotService({ user, facilityIdString, variant }) {
  const facility = await resolveAccessibleFacility(user, facilityIdString);
  if (!facility) {
    throwError("Facility not found or access denied", 404);
  }

  if (variant === "energy") {
    return aggregateElectricalEnergyAuditForFacility(facility._id);
  }
  return aggregateElectricalSafetyAuditForFacility(facility._id);
}

/**
 * GET /api/v1/audits/electrical-energy?facility_id=
 */
export async function getElectricalEnergyAuditService({ user, facilityIdString }) {
  return getAuditSnapshotService({ user, facilityIdString, variant: "energy" });
}

/**
 * GET /api/v1/audits/electrical-safety?facility_id=
 */
export async function getElectricalSafetyAuditService({ user, facilityIdString }) {
  return getAuditSnapshotService({ user, facilityIdString, variant: "safety" });
}

/**
 * GET /api/v1/audits/facility-snapshot?audit_type=&facility_id=
 * Resolves the audit_type string to a canonical variant and fetches the snapshot.
 */
export async function getFacilityAuditSnapshotService({ user, facilityIdString, rawAuditType }) {
  if (rawAuditType === undefined || rawAuditType === null || String(rawAuditType).trim() === "") {
    throwError("audit_type query parameter is required", 400);
  }

  const trimmed = String(rawAuditType).trim();
  let variant = resolveAuditTypeVariant(trimmed);

  // Try exact canonical labels as fallback
  if (!variant) {
    if (trimmed === ELECTRICAL_ENERGY_AUDIT_LABEL) variant = "energy";
    else if (trimmed === ELECTRICAL_SAFETY_AUDIT_LABEL) variant = "safety";
  }

  if (!variant) {
    throwError(
      `Invalid audit_type. Use "${ELECTRICAL_ENERGY_AUDIT_LABEL}", "${ELECTRICAL_SAFETY_AUDIT_LABEL}", or aliases such as electrical_energy / electrical_safety`,
      400,
    );
  }

  return getAuditSnapshotService({ user, facilityIdString, variant });
}
