import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createFacilityService,
  createFacilityFromEnquiryService,
  getFacilitiesService,
  getFacilitiesUtilityProgressService,
  getFacilityByIdService,
  updateFacilityService,
  deleteFacilityService,
} from "./facility.services.js";
import {
  closeFacilityAuditService,
  openFacilityAuditService,
} from "../facility-workflow/index.js";

// @route POST /api/v1/facilities
// @desc Create a Facility
// @access Protected
const createFacility = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const facility = await createFacilityService({
    user: req.user,
    body: req.body,
    files: req.files,
    io,
  });

  res.status(201).json({
    success: true,
    message: "Facility created successfully",
    data: facility,
  });
});

// @route POST /api/v1/enquiries/:enquiryId/facility
// @desc Create Facility from submitted (won) enquiry and link them
// @access super_admin only
const createFacilityFromEnquiry = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const facility = await createFacilityFromEnquiryService({
    user: req.user,
    enquiryId: req.params.enquiryId,
    body: req.body,
    files: req.files,
    io,
  });

  res.status(201).json({
    success: true,
    message: "Facility created from enquiry successfully",
    data: facility,
  });
});

// @route GET /api/v1/facilities
// @desc Get all Facilities
// @access Protected
const getFacilities = asyncHandler(async (req, res) => {
  const facilities = await getFacilitiesService(req.user);

  res.status(200).json({
    success: true,
    count: facilities.length,
    data: facilities,
  });
});

// @route GET /api/v1/facilities/utility-progress
// @desc Get utility audit progress for specific facilities
// @access Protected
const getFacilitiesUtilityProgress = asyncHandler(async (req, res) => {
  const data = await getFacilitiesUtilityProgressService(
    req.user,
    req.query.facility_ids,
  );

  res.status(200).json({
    success: true,
    data,
  });
});

// @route GET /api/v1/facilities/:id
// @desc Get single Facility
// @access Protected
const getFacilityById = asyncHandler(async (req, res) => {
  const result = await getFacilityByIdService(req.user, req.params.id);

  res.status(200).json({
    success: true,
    data: result,
  });
});

// @route PUT /api/v1/facilities/:id
// @desc Update Facility
// @access Protected
const updateFacility = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const result = await updateFacilityService({
    user: req.user,
    facilityId: req.params.id,
    body: req.body,
    files: req.files,
    io,
  });

  res.status(200).json({
    success: true,
    message: "Facility updated successfully",
    data: result,
  });
});

// @route DELETE /api/v1/facilities/:id
// @desc Delete Facility
// @access Protected
const deleteFacility = asyncHandler(async (req, res) => {
  await deleteFacilityService(req.user, req.params.id);

  res.status(200).json({
    success: true,
    message: "Facility deleted successfully",
  });
});

// @route POST /api/v1/facilities/:id/audit-close
// @desc Close facility audit (when all utility audits are completed)
// @access Protected
const closeFacilityAudit = asyncHandler(async (req, res) => {
  const io = req.app.get("io");
  const facility = await closeFacilityAuditService(req.user, req.params.id, io);

  res.status(200).json({
    success: true,
    message: "Facility audit closed successfully",
    data: facility,
  });
});

// @route POST /api/v1/facilities/:id/audit-open
// @desc Re-open facility audit
// @access Protected
const openFacilityAudit = asyncHandler(async (req, res) => {
  const facility = await openFacilityAuditService(req.user, req.params.id);

  res.status(200).json({
    success: true,
    message: "Facility audit opened successfully",
    data: facility,
  });
});

export {
  createFacility,
  createFacilityFromEnquiry,
  getFacilities,
  getFacilitiesUtilityProgress,
  getFacilityById,
  updateFacility,
  deleteFacility,
  closeFacilityAudit,
  openFacilityAudit,
};
