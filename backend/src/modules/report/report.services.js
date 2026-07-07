import { modelsRegistry } from "../../data/modelRegistry.js";
const { Report, Facility, FacilityAuditor } = modelsRegistry;



import { createRecentActivity } from "../../helpers/createRecentActivity.js";
import { buildActivityMessage } from "../../helpers/buildActivityMessage.js";
import { addReportJob } from "../../queues/addReportJob.js";
import {
  can,
  hasOrgWideReportListAccess,
  isAdmin,
  resolveAccessibleFacility,
  resolveAccessibleUtilityAccount,
} from "../../services/authorization/index.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";
import {
  assertReportTypeMatchesFacilityAuditProgram,
  buildDefaultTitle,
  buildSnapshotMeta,
  throwError,
  validateGeneratePayload,
} from "../../services/report/pipeline/reportGenerateValidation.js";
import { buildExcelBufferForReport } from "../../services/report/pipeline/reportExcelExportOrchestrator.js";

// ─── Private helpers ──────────────────────────────────────────────────────────

const toIdString = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const assertOwnReportForNonAdmin = (user, report) => {
  if (isAdmin(user)) return;
  if (toIdString(report?.created_by) !== toIdString(user?._id)) {
    throwError("Access denied", 403);
  }
};

const populateReportById = (reportId) =>
  Report.findById(reportId)
    .populate("facility_id", "name city address audit_type")
    .populate("utility_account_id", "account_number connection_type category")
    .populate("created_by", "name email role");

const resolveReportContext = async ({ user, facility_id, utility_account_id, report_scope }) => {
  const facility = await resolveAccessibleFacility(user, facility_id);
  if (!facility) throwError("Access denied for facility", 403);

  let utilityAccount = null;
  if (report_scope === "utility_account" || utility_account_id) {
    utilityAccount = await resolveAccessibleUtilityAccount(user, utility_account_id);
    if (!utilityAccount) throwError("Access denied for utility account", 403);
    if (utilityAccount.facility_id.toString() !== facility._id.toString()) {
      throwError("utility_account_id does not belong to the given facility", 400);
    }
  }

  return { facility, utilityAccount };
};

const assertReportPermission = async (user, action, facilityId) => {
  const allowed = await can(user, RESOURCES.REPORT, action, {
    facilityId: facilityId ? String(facilityId) : undefined,
  });
  if (!allowed) throwError("Access denied", 403);
};

const createProcessingReport = async ({ facility, utilityAccount, report_scope, report_type, title, snapshot_meta, user }) =>
  Report.create({
    facility_id: facility._id,
    utility_account_id: utilityAccount?._id || null,
    report_scope,
    report_type,
    title: title || buildDefaultTitle({ facility, utilityAccount, reportType: report_type }),
    status: "processing",
    snapshot_meta: buildSnapshotMeta({ facility, utilityAccount, snapshot_meta }),
    created_by: user._id,
  });

// ─── Services ─────────────────────────────────────────────────────────────────

/**
 * Generate a new report and queue it for background processing.
 */
export async function generateReportService({ user, body }) {
  const { facility_id, utility_account_id, report_scope, report_type, title, snapshot_meta } = body;

  const validated = validateGeneratePayload({ facility_id, utility_account_id, report_scope, report_type });

  const { facility, utilityAccount } = await resolveReportContext({
    user,
    facility_id,
    utility_account_id,
    report_scope: validated.report_scope,
  });

  assertReportTypeMatchesFacilityAuditProgram(facility, validated.report_type);
  await assertReportPermission(user, ACTIONS.GENERATE_REPORT, facility?._id || facility_id);

  const report = await createProcessingReport({
    facility,
    utilityAccount,
    report_scope: validated.report_scope,
    report_type: validated.report_type,
    title,
    snapshot_meta,
    user,
  });

  await addReportJob({
    reportId: String(report._id),
    requestedBy: String(user._id),
    action: "generate",
  });

  return await populateReportById(report._id);
}

/**
 * Regenerate an existing report from scratch.
 */
export async function regenerateReportService({ user, reportId }) {
  const report = await Report.findById(reportId);
  if (!report) throwError("Report not found", 404);
  assertOwnReportForNonAdmin(user, report);

  const { facility } = await resolveReportContext({
    user,
    facility_id: report.facility_id,
    utility_account_id: report.utility_account_id,
    report_scope: report.report_scope,
  });
  assertReportTypeMatchesFacilityAuditProgram(facility, report.report_type);
  await assertReportPermission(user, ACTIONS.GENERATE_REPORT, report.facility_id);

  report.status = "processing";
  report.error_message = "";
  await report.save();

  await addReportJob({
    reportId: String(report._id),
    requestedBy: String(user._id),
    action: "regenerate",
  });

  return await populateReportById(report._id);
}

/**
 * Create a report row without triggering background generation.
 */
export async function createReportService({ user, body }) {
  const { facility_id, utility_account_id, report_scope, report_type, title, snapshot_meta } = body;

  const validated = validateGeneratePayload({ facility_id, utility_account_id, report_scope, report_type });

  const { facility, utilityAccount } = await resolveReportContext({
    user,
    facility_id,
    utility_account_id,
    report_scope: validated.report_scope,
  });

  assertReportTypeMatchesFacilityAuditProgram(facility, validated.report_type);
  await assertReportPermission(user, ACTIONS.CREATE, facility?._id || facility_id);

  const report = await Report.create({
    facility_id: facility._id,
    utility_account_id: utilityAccount?._id || null,
    report_scope: validated.report_scope,
    report_type: validated.report_type,
    title: title || buildDefaultTitle({ facility, utilityAccount, reportType: validated.report_type }),
    status: "processing",
    snapshot_meta: buildSnapshotMeta({ facility, utilityAccount, snapshot_meta }),
    created_by: user._id,
  });

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "report",
    entity_id: report._id,
    entity_name: report.title || "Report",
    facility_id: report.facility_id,
    utility_account_id: report.utility_account_id,
    message: buildActivityMessage({ actorName: user?.name || "User", action: "created", entityLabel: "report", entityName: report.title || "" }),
    meta: { report_scope: report.report_scope, report_type: report.report_type, status: report.status },
  });

  return await populateReportById(report._id);
}

/**
 * Get all reports accessible to the user, with optional query filters.
 */
export async function getReportsService({ user, query: rawQuery }) {
  const { facility_id, utility_account_id, report_scope, report_type, status } = rawQuery;
  const query = {};

  if (facility_id) query.facility_id = facility_id;
  if (utility_account_id) query.utility_account_id = utility_account_id;
  if (report_scope) query.report_scope = report_scope;
  if (report_type) query.report_type = report_type;
  if (status) query.status = status;
  if (!isAdmin(user)) query.created_by = user._id;

  if (query.facility_id) {
    await assertReportPermission(user, ACTIONS.READ, query.facility_id);
  }

  if (!hasOrgWideReportListAccess(user)) {
    const [assignedFacilities, ownedFacilities] = await Promise.all([
      FacilityAuditor.find({ user_id: user._id }).select("facility_id"),
      Facility.find({ owner_user_id: user._id }).select("_id"),
    ]);

    const accessibleFacilityIds = [
      ...new Set([
        ...assignedFacilities.map((item) => String(item.facility_id)),
        ...ownedFacilities.map((item) => String(item._id)),
      ]),
    ];

    if (!accessibleFacilityIds.length) return [];

    if (query.facility_id) {
      if (!accessibleFacilityIds.includes(String(query.facility_id))) return [];
    } else {
      query.facility_id = { $in: accessibleFacilityIds };
    }
  }

  return Report.find(query)
    .populate("facility_id", "name city audit_type")
    .populate("utility_account_id", "account_number connection_type category")
    .populate("created_by", "name email role")
    .sort({ createdAt: -1 });
}

/**
 * Get a single report by ID.
 */
export async function getReportByIdService({ user, reportId }) {
  const report = await populateReportById(reportId);
  if (!report) throwError("Report not found", 404);
  assertOwnReportForNonAdmin(user, report);

  const facility = await resolveAccessibleFacility(user, report.facility_id?._id || report.facility_id);
  if (!facility) throwError("Access denied", 403);
  await assertReportPermission(user, ACTIONS.VIEW_REPORT, facility._id);

  return report;
}

/**
 * Update allowed metadata fields (title, snapshot_meta) on a report.
 */
export async function updateReportService({ user, reportId, body }) {
  const report = await Report.findById(reportId);
  if (!report) throwError("Report not found", 404);
  assertOwnReportForNonAdmin(user, report);

  const facility = await resolveAccessibleFacility(user, report.facility_id);
  if (!facility) throwError("Access denied", 403);
  await assertReportPermission(user, ACTIONS.UPDATE, facility._id);

  const allowedFields = ["title", "snapshot_meta"];
  const updatedFields = [];
  allowedFields.forEach((field) => {
    if (body[field] !== undefined) {
      report[field] = body[field];
      updatedFields.push(field);
    }
  });

  await report.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "report",
    entity_id: report._id,
    entity_name: report.title || "Report",
    facility_id: report.facility_id,
    utility_account_id: report.utility_account_id,
    message: buildActivityMessage({ actorName: user?.name || "User", action: "updated", entityLabel: "report", entityName: report.title || "" }),
    meta: { updated_fields: [...new Set(updatedFields)], report_scope: report.report_scope, report_type: report.report_type, status: report.status },
  });

  return await populateReportById(report._id);
}

/**
 * Soft-delete a report.
 */
export async function deleteReportService({ user, reportId }) {
  const report = await Report.findById(reportId);
  if (!report) throwError("Report not found", 404);
  assertOwnReportForNonAdmin(user, report);

  const facility = await resolveAccessibleFacility(user, report.facility_id);
  if (!facility) throwError("Access denied", 403);
  await assertReportPermission(user, ACTIONS.DELETE, facility._id);

  const entityName = report.title || "Report";
  const { facility_id: facilityId, utility_account_id: utilityId, report_scope: reportScope, report_type: reportType, status: reportStatus } = report;

  await report.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "report",
    entity_id: report._id,
    entity_name: entityName,
    facility_id: facilityId,
    utility_account_id: utilityId,
    message: buildActivityMessage({ actorName: user?.name || "User", action: "deleted", entityLabel: "report", entityName }),
    meta: { report_scope: reportScope, report_type: reportType, status: reportStatus },
  });
}

/**
 * Build and stream the Excel export buffer for a report.
 */
export async function downloadExcelReportService({ user, reportId }) {
  const report = await Report.findById(reportId);
  if (!report) throwError("Report not found", 404);
  assertOwnReportForNonAdmin(user, report);

  const { facility, utilityAccount } = await resolveReportContext({
    user,
    facility_id: report.facility_id,
    utility_account_id: report.utility_account_id,
    report_scope: report.report_scope,
  });
  assertReportTypeMatchesFacilityAuditProgram(facility, report.report_type);
  await assertReportPermission(user, ACTIONS.DOWNLOAD, facility?._id);

  const buffer = await buildExcelBufferForReport({ report, facility, utilityAccount });
  return { buffer, filename: report.title || "report" };
}
