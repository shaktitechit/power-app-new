import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createEnquiryService,
  getEnquiriesService,
  getEnquiryByIdService,
  updateEnquiryService,
  deleteEnquiryService,
  getFollowUpsService,
  createFollowUpService,
  getFollowUpByIdService,
  updateFollowUpService,
  deleteFollowUpService,
  getEnquiryDocumentsService,
  createEnquiryDocumentService,
  getEnquiryDocumentByIdService,
  updateEnquiryDocumentService,
  deleteEnquiryDocumentService,
} from "./enquiry.services.js";

// ─── Enquiry handlers ─────────────────────────────────────────────────────────

// POST /api/v1/enquiries
export const createEnquiry = asyncHandler(async (req, res) => {
  const data = await createEnquiryService({
    user: req.user,
    body: req.body,
    io: req.app.get("io"),
  });
  return res.status(201).json({ success: true, message: "Enquiry created successfully", data });
});

// GET /api/v1/enquiries
export const getEnquiries = asyncHandler(async (req, res) => {
  const data = await getEnquiriesService({ user: req.user, query: req.query });
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/enquiries/:id
export const getEnquiryById = asyncHandler(async (req, res) => {
  const data = await getEnquiryByIdService({ user: req.user, enquiryId: req.params.id });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/enquiries/:id
export const updateEnquiry = asyncHandler(async (req, res) => {
  const data = await updateEnquiryService({
    user: req.user,
    enquiryId: req.params.id,
    body: req.body,
    io: req.app.get("io"),
  });
  return res.status(200).json({ success: true, message: "Enquiry updated successfully", data });
});

// DELETE /api/v1/enquiries/:id
export const deleteEnquiry = asyncHandler(async (req, res) => {
  await deleteEnquiryService({ user: req.user, enquiryId: req.params.id });
  return res.status(200).json({ success: true, message: "Enquiry deleted successfully" });
});

// ─── Follow-up handlers ───────────────────────────────────────────────────────

// GET /api/v1/enquiries/:enquiryId/follow-ups
export const getFollowUps = asyncHandler(async (req, res) => {
  const rows = await getFollowUpsService({ user: req.user, enquiryId: req.params.enquiryId });
  return res.status(200).json({ success: true, count: rows.length, data: rows });
});

// POST /api/v1/enquiries/:enquiryId/follow-ups
export const createFollowUp = asyncHandler(async (req, res) => {
  const data = await createFollowUpService({ user: req.user, enquiryId: req.params.enquiryId, body: req.body });
  return res.status(201).json({ success: true, message: "Follow-up recorded successfully", data });
});

// GET /api/v1/enquiries/:enquiryId/follow-ups/:followUpId
export const getFollowUpById = asyncHandler(async (req, res) => {
  const data = await getFollowUpByIdService({ user: req.user, enquiryId: req.params.enquiryId, followUpId: req.params.followUpId });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/enquiries/:enquiryId/follow-ups/:followUpId
export const updateFollowUp = asyncHandler(async (req, res) => {
  const data = await updateFollowUpService({ user: req.user, enquiryId: req.params.enquiryId, followUpId: req.params.followUpId, body: req.body });
  return res.status(200).json({ success: true, message: "Follow-up updated successfully", data });
});

// DELETE /api/v1/enquiries/:enquiryId/follow-ups/:followUpId
export const deleteFollowUp = asyncHandler(async (req, res) => {
  await deleteFollowUpService({ user: req.user, enquiryId: req.params.enquiryId, followUpId: req.params.followUpId });
  return res.status(200).json({ success: true, message: "Follow-up deleted successfully" });
});

// ─── Quotation handlers ───────────────────────────────────────────────────────


// GET /api/v1/enquiries/:enquiryId/enquiry-documents
export const getEnquiryDocuments = asyncHandler(async (req, res) => {
  const rows = await getEnquiryDocumentsService({ user: req.user, enquiryId: req.params.enquiryId });
  return res.status(200).json({ success: true, count: rows.length, data: rows });
});

// POST /api/v1/enquiries/:enquiryId/enquiry-documents
export const createEnquiryDocument = asyncHandler(async (req, res) => {
  try {
    const data = await createEnquiryDocumentService({ user: req.user, enquiryId: req.params.enquiryId, body: req.body, files: req.files });
    return res.status(201).json({ success: true, message: "Document created successfully", data });
  } catch (err) {
    if (err?.code === 11000) {
      res.status(409);
      throw new Error("Document number already in use");
    }
    throw err;
  }
});

// GET /api/v1/enquiries/:enquiryId/enquiry-documents/:enquiryDocumentId
export const getEnquiryDocumentById = asyncHandler(async (req, res) => {
  const data = await getEnquiryDocumentByIdService({ user: req.user, enquiryId: req.params.enquiryId, enquiryDocumentId: req.params.enquiryDocumentId });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/enquiries/:enquiryId/enquiry-documents/:enquiryDocumentId
export const updateEnquiryDocument = asyncHandler(async (req, res) => {
  try {
    const data = await updateEnquiryDocumentService({ user: req.user, enquiryId: req.params.enquiryId, enquiryDocumentId: req.params.enquiryDocumentId, body: req.body, files: req.files });
    return res.status(200).json({ success: true, message: "Document updated successfully", data });
  } catch (err) {
    if (err?.code === 11000) {
      res.status(409);
      throw new Error("Document number already in use");
    }
    throw err;
  }
});

// DELETE /api/v1/enquiries/:enquiryId/enquiry-documents/:enquiryDocumentId
export const deleteEnquiryDocument = asyncHandler(async (req, res) => {
  await deleteEnquiryDocumentService({ user: req.user, enquiryId: req.params.enquiryId, enquiryDocumentId: req.params.enquiryDocumentId, body: req.body });
  return res.status(200).json({ success: true, message: "Document deleted successfully" });
});
