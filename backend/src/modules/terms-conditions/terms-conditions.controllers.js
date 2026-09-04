import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  createTermsConditionsService,
  getTermsConditionsService,
  getTermsConditionsByIdService,
  updateTermsConditionsService,
  deleteTermsConditionsService,
} from "./terms-conditions.services.js";

// POST /api/v1/terms-conditions
export const createTermsConditions = asyncHandler(async (req, res) => {
  const data = await createTermsConditionsService({
    user: req.user,
    body: req.body,
  });
  return res.status(201).json({
    success: true,
    message: "Terms & conditions created successfully",
    data,
  });
});

// GET /api/v1/terms-conditions
export const getTermsConditions = asyncHandler(async (_req, res) => {
  const data = await getTermsConditionsService();
  return res.status(200).json({ success: true, count: data.length, data });
});

// GET /api/v1/terms-conditions/:id
export const getTermsConditionsById = asyncHandler(async (req, res) => {
  const data = await getTermsConditionsByIdService({ termsId: req.params.id });
  return res.status(200).json({ success: true, data });
});

// PUT /api/v1/terms-conditions/:id
export const updateTermsConditions = asyncHandler(async (req, res) => {
  const data = await updateTermsConditionsService({
    user: req.user,
    termsId: req.params.id,
    body: req.body,
  });
  return res.status(200).json({
    success: true,
    message: "Terms & conditions updated successfully",
    data,
  });
});

// DELETE /api/v1/terms-conditions/:id
export const deleteTermsConditions = asyncHandler(async (req, res) => {
  await deleteTermsConditionsService({ termsId: req.params.id });
  return res.status(200).json({
    success: true,
    message: "Terms & conditions deleted successfully",
  });
});
