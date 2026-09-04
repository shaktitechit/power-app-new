import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createEoiService,
  getEoisService,
  getEoiByIdService,
  updateEoiService,
  updateEoiStatusService,
  acceptEoiService,
  sendEoiEmailService,
  deleteEoiService,
  getEoiSignatoriesService,
  approveEoiSignatoryService,
} from "./expression-of-interest.services.js";

// POST /api/v1/expression-of-interest
export const createEoi = asyncHandler(async (req, res) => {
  try {
    const data = await createEoiService({
      user: req.user,
      body: req.body,
      io: req.app.get("io"),
    });
    return res.status(201).json({
      success: true,
      message: "Expression of interest created successfully",
      data,
    });
  } catch (err) {
    if (err?.code === 11000) {
      res.status(409);
      throw new Error("Expression of interest reference already in use");
    }
    throw err;
  }
});

// GET /api/v1/expression-of-interest
export const getEois = asyncHandler(async (req, res) => {
  const data = await getEoisService({
    user: req.user,
    query: req.query,
  });
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/expression-of-interest/signatories
export const getEoiSignatories = asyncHandler(async (_req, res) => {
  const data = await getEoiSignatoriesService();
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/expression-of-interest/:id
export const getEoiById = asyncHandler(async (req, res) => {
  const data = await getEoiByIdService({
    user: req.user,
    eoiId: req.params.id,
  });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/expression-of-interest/:id
export const updateEoi = asyncHandler(async (req, res) => {
  const data = await updateEoiService({
    user: req.user,
    eoiId: req.params.id,
    body: req.body,
  });
  return res.status(200).json({
    success: true,
    message: "Expression of interest updated successfully",
    data,
  });
});

// PUT /api/v1/expression-of-interest/:id/status
export const updateEoiStatus = asyncHandler(async (req, res) => {
  const data = await updateEoiStatusService({
    user: req.user,
    eoiId: req.params.id,
    body: req.body,
  });
  return res.status(200).json({
    success: true,
    message: "Expression of interest status updated successfully",
    data,
  });
});

// PUT /api/v1/expression-of-interest/:id/accept
export const acceptEoi = asyncHandler(async (req, res) => {
  const data = await acceptEoiService({
    user: req.user,
    eoiId: req.params.id,
    body: req.body,
  });
  return res.status(200).json({
    success: true,
    message: "Expression of interest accepted successfully",
    data,
  });
});

// PUT /api/v1/expression-of-interest/:id/signatory-approval
export const approveEoiSignatory = asyncHandler(async (req, res) => {
  const data = await approveEoiSignatoryService({
    user: req.user,
    eoiId: req.params.id,
    io: req.app.get("io"),
  });
  return res.status(200).json({
    success: true,
    message: "Expression of interest approved by signatory",
    data,
  });
});

// POST /api/v1/expression-of-interest/:id/send-email
export const sendEoiEmail = asyncHandler(async (req, res) => {
  const data = await sendEoiEmailService({
    user: req.user,
    eoiId: req.params.id,
    body: req.body,
    file: req.file,
  });
  return res.status(200).json({
    success: true,
    message: "Expression of interest emailed successfully",
    data,
  });
});

// DELETE /api/v1/expression-of-interest/:id
export const deleteEoi = asyncHandler(async (req, res) => {
  await deleteEoiService({
    user: req.user,
    eoiId: req.params.id,
  });
  return res.status(200).json({
    success: true,
    message: "Expression of interest deleted successfully",
  });
});
