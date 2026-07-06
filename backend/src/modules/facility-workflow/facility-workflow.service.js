import { modelsRegistry } from "../../data/modelRegistry.js";
import { isUtilityAuditCompleted } from "../../helpers/auditState.js";
import { can } from "../../services/authorization/index.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import {
  createRecentActivity,
  buildActivityMessage,
  createNotification,
  resolveAccessibleFacility,
} from "../shared/electrical-audit.helpers.js";

const { Facility, FacilityAuditor, UtilityAccount } = modelsRegistry;

/**
 * Checks if a facility's audit is closed (locked).
 */
export const isFacilityAuditClosed = (facility) => {
  const closedAt = facility?.audit_closure?.closed_at;
  if (!closedAt) return false;
  const d = new Date(closedAt);
  return !Number.isNaN(d.getTime());
};

/**
 * Closes the facility audit if all utility audits are completed.
 */
export const closeFacilityAuditService = async (user, facilityId, io) => {
  const facility = await resolveAccessibleFacility(user, facilityId);

  if (!facility) {
    const error = new Error("Facility not found");
    error.statusCode = 404;
    throw error;
  }

  const mayClose = await can(user, RESOURCES.FACILITY, ACTIONS.CLOSE_FACILITY_AUDIT, {
    facilityId: facilityId,
  });
  if (!mayClose) {
    const error = new Error("You do not have permission to close this facility audit");
    error.statusCode = 403;
    throw error;
  }

  const utilities = await UtilityAccount.find({ facility_id: facility._id });
  if (utilities.length > 0) {
    const allUtilitiesCompleted = utilities.every((utility) =>
      isUtilityAuditCompleted(utility),
    );

    if (!allUtilitiesCompleted) {
      const error = new Error(
        "Cannot close facility audit until all utility audits are completed",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  facility.audit_closure = {
    ...(facility.audit_closure || {}),
    closed_at: new Date(),
    closed_by: user._id,
  };
  await facility.save();

  await createNotification(io, {
    recipient: facility.owner_user_id,
    sender: user._id,
    title: "Facility Audit Closed",
    message: `Facility audit closed for: ${facility.name}`,
    type: "facility",
    referenceId: facility._id,
  });

  const auditors = await FacilityAuditor.find({ facility_id: facility._id });
  for (const auditor of auditors) {
    await createNotification(io, {
      recipient: auditor.user_id,
      sender: user._id,
      title: "Facility Audit Closed",
      message: `Facility audit closed for: ${facility.name}`,
      type: "facility",
      referenceId: facility._id,
    });
  }

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "facility",
    entity_id: facility._id,
    entity_name: facility.name,
    facility_id: facility._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "facility audit",
      entityName: `${facility.name} (closed)`,
    }),
    meta: {
      audit_closed: true,
    },
  });

  return facility;
};

/**
 * Re-opens a closed facility audit.
 */
export const openFacilityAuditService = async (user, facilityId) => {
  const facility = await resolveAccessibleFacility(user, facilityId);

  if (!facility) {
    const error = new Error("Facility not found");
    error.statusCode = 404;
    throw error;
  }

  const mayReopen = await can(user, RESOURCES.FACILITY, ACTIONS.REOPEN_FACILITY_AUDIT, {
    facilityId: facilityId,
  });
  if (!mayReopen) {
    const error = new Error("You do not have permission to re-open this facility audit");
    error.statusCode = 403;
    throw error;
  }

  facility.audit_closure = {
    ...(facility.audit_closure || {}),
    closed_at: undefined,
    closed_by: undefined,
    reopened_at: new Date(),
    reopened_by: user._id,
  };
  await facility.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "facility",
    entity_id: facility._id,
    entity_name: facility.name,
    facility_id: facility._id,
    message: buildActivityMessage({
      actorName: user?.name || "User",
      action: "updated",
      entityLabel: "facility audit",
      entityName: `${facility.name} (re-opened)`,
    }),
    meta: {
      audit_reopened: true,
    },
  });

  return facility;
};
