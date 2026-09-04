import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createQuotationService,
  getQuotationsService,
  getQuotationByIdService,
  updateQuotationService,
  updateQuotationStatusService,
  acceptQuotationService,
  sendQuotationEmailService,
  deleteQuotationService,
  getQuotationSignatoriesService,
  approveQuotationSignatoryService,
} from "./quotation.services.js";

// POST /api/v1/quotations
export const createQuotation = asyncHandler(async (req, res) => {
  try {
    const data = await createQuotationService({
      user: req.user,
      body: req.body,
      io: req.app.get("io"),
    });
    return res.status(201).json({
      success: true,
      message: "Quotation created successfully",
      data,
    });
  } catch (err) {
    if (err?.code === 11000) {
      res.status(409);
      throw new Error("Quotation reference already in use");
    }
    throw err;
  }
});

// GET /api/v1/quotations
export const getQuotations = asyncHandler(async (req, res) => {
  const data = await getQuotationsService({
    user: req.user,
    query: req.query,
  });
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/quotations/signatories
export const getQuotationSignatories = asyncHandler(async (_req, res) => {
  const data = await getQuotationSignatoriesService();
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/quotations/:id
export const getQuotationById = asyncHandler(async (req, res) => {
  const data = await getQuotationByIdService({
    user: req.user,
    quotationId: req.params.id,
  });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/quotations/:id
export const updateQuotation = asyncHandler(async (req, res) => {
  const data = await updateQuotationService({
    user: req.user,
    quotationId: req.params.id,
    body: req.body,
  });
  return res.status(200).json({
    success: true,
    message: "Quotation updated successfully",
    data,
  });
});

// PUT /api/v1/quotations/:id/status
export const updateQuotationStatus = asyncHandler(async (req, res) => {
  const data = await updateQuotationStatusService({
    user: req.user,
    quotationId: req.params.id,
    body: req.body,
  });
  return res.status(200).json({
    success: true,
    message: "Quotation status updated successfully",
    data,
  });
});

// PUT /api/v1/quotations/:id/accept
export const acceptQuotation = asyncHandler(async (req, res) => {
  const data = await acceptQuotationService({
    user: req.user,
    quotationId: req.params.id,
    body: req.body,
  });
  return res.status(200).json({
    success: true,
    message: "Quotation accepted successfully",
    data,
  });
});

// PUT /api/v1/quotations/:id/signatory-approval
export const approveQuotationSignatory = asyncHandler(async (req, res) => {
  const data = await approveQuotationSignatoryService({
    user: req.user,
    quotationId: req.params.id,
    io: req.app.get("io"),
  });
  return res.status(200).json({
    success: true,
    message: "Quotation approved by signatory",
    data,
  });
});

// POST /api/v1/quotations/:id/send-email
export const sendQuotationEmail = asyncHandler(async (req, res) => {
  const data = await sendQuotationEmailService({
    user: req.user,
    quotationId: req.params.id,
    body: req.body,
    file: req.file,
  });
  return res.status(200).json({
    success: true,
    message: "Quotation emailed successfully",
    data,
  });
});

// DELETE /api/v1/quotations/:id
export const deleteQuotation = asyncHandler(async (req, res) => {
  await deleteQuotationService({
    user: req.user,
    quotationId: req.params.id,
  });
  return res.status(200).json({
    success: true,
    message: "Quotation deleted successfully",
  });
});
