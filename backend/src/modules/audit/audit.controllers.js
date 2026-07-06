import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  parseFacilityId,
  getElectricalEnergyAuditService,
  getElectricalSafetyAuditService,
  getFacilityAuditSnapshotService,
} from "./audit.services.js";

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
