import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getExternalEnquiriesService,
  getExternalEnquiryByIdService,
  getExternalFacilitiesService,
  getExternalFacilityByIdService,
} from "./external.services.js";

/**
 * GET /api/v1/external/enquiries
 * List enquiries for third-party integration
 */
export const getExternalEnquiries = asyncHandler(async (req, res) => {
  const result = await getExternalEnquiriesService({ query: req.query });
  return res.status(200).json({
    success: true,
    pagination: result.pagination,
    data: result.data,
  });
});

/**
 * GET /api/v1/external/enquiries/:id
 * Retrieve a single enquiry by MongoDB ID or enquiry_number
 */
export const getExternalEnquiryById = asyncHandler(async (req, res) => {
  const enquiry = await getExternalEnquiryByIdService({ enquiryId: req.params.id });
  return res.status(200).json({
    success: true,
    data: enquiry,
  });
});

/**
 * GET /api/v1/external/facilities
 * List facilities for third-party integration
 */
export const getExternalFacilities = asyncHandler(async (req, res) => {
  const result = await getExternalFacilitiesService({ query: req.query });
  return res.status(200).json({
    success: true,
    pagination: result.pagination,
    data: result.data,
  });
});

/**
 * GET /api/v1/external/facilities/:id
 * Retrieve a single facility by MongoDB ID or audit_number
 */
export const getExternalFacilityById = asyncHandler(async (req, res) => {
  const facility = await getExternalFacilityByIdService({ facilityId: req.params.id });
  return res.status(200).json({
    success: true,
    data: facility,
  });
});
