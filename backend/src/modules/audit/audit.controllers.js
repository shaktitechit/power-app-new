import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  parseFacilityId,
  getElectricalEnergyAuditService,
  getElectricalSafetyAuditService,
  getFacilityAuditSnapshotService,
} from "./audit.services.js";
import {
  getAuditAiContextService,
  analyzeAuditAiService,
} from "./auditAiAnalyze.services.js";

const requireFacilityId = (raw) => {
  const id = parseFacilityId(raw);
  if (!id) {
    const err = new Error("Valid facility_id query parameter is required");
    err.statusCode = 400;
    throw err;
  }
  return id;
};

/**
 * GET /api/v1/audits/electrical-energy?facility_id=
 */
export const getElectricalEnergyAudit = asyncHandler(async (req, res) => {
  const facilityIdString = requireFacilityId(req.query.facility_id);
  const data = await getElectricalEnergyAuditService({
    user: req.user,
    facilityIdString,
  });
  return res.status(200).json({ success: true, data });
});

/**
 * GET /api/v1/audits/electrical-safety?facility_id=
 */
export const getElectricalSafetyAudit = asyncHandler(async (req, res) => {
  const facilityIdString = requireFacilityId(req.query.facility_id);
  const data = await getElectricalSafetyAuditService({
    user: req.user,
    facilityIdString,
  });
  return res.status(200).json({ success: true, data });
});

/**
 * GET /api/v1/audits/facility-snapshot?audit_type=&facility_id=
 */
export const getFacilityAuditSnapshot = asyncHandler(async (req, res) => {
  const facilityIdString = requireFacilityId(req.query.facility_id);
  const data = await getFacilityAuditSnapshotService({
    user: req.user,
    facilityIdString,
    rawAuditType: req.query.audit_type,
  });
  return res.status(200).json({ success: true, data });
});

/**
 * POST /api/v1/audits/ai-context
 */
export const postAuditAiContext = asyncHandler(async (req, res) => {
  const facilityIdString = requireFacilityId(req.body.facility_id);
  const { audit_type: auditType, question_id: questionId, options } = req.body;
  if (!auditType || !questionId) {
    const err = new Error("audit_type and question_id are required");
    err.statusCode = 400;
    throw err;
  }
  const data = await getAuditAiContextService({
    user: req.user,
    facilityIdString,
    auditType,
    questionId,
    options,
  });
  return res.status(200).json({ success: true, data });
});

/**
 * POST /api/v1/audits/ai-analyze
 */
export const postAuditAiAnalyze = asyncHandler(async (req, res) => {
  const facilityIdString = requireFacilityId(req.body.facility_id);
  const {
    audit_type: auditType,
    question_id: questionId,
    follow_up_text: followUpText,
    prior_turns: priorTurns,
    options,
  } = req.body;
  if (!auditType || !questionId) {
    const err = new Error("audit_type and question_id are required");
    err.statusCode = 400;
    throw err;
  }
  const data = await analyzeAuditAiService({
    user: req.user,
    facilityIdString,
    auditType,
    questionId,
    followUpText,
    priorTurns: Array.isArray(priorTurns) ? priorTurns : [],
    options,
  });
  return res.status(200).json({ success: true, data });
});
