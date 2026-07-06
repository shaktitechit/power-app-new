import {
  createService,
  getAllService,
  getByIdService,
  updateService,
  removeService,
} from "./safety-pac-ventilation.services.js";
import asyncHandler from "../../../middlewares/asyncHandler.js";

export const create = asyncHandler(async (req, res) => {
  const record = await createService({
    user: req.user,
    body: req.body,
    files: req.files,
  });
  res.status(201).json({ success: true, data: record });
});

export const getAll = asyncHandler(async (req, res) => {
  const records = await getAllService({
    user: req.user,
    query: req.query,
  });
  res.json({ success: true, count: records.length, data: records });
});

export const getById = asyncHandler(async (req, res) => {
  const record = await getByIdService({
    user: req.user,
    id: req.params.id,
  });
  res.json({ success: true, data: record });
});

export const update = asyncHandler(async (req, res) => {
  const updated = await updateService({
    user: req.user,
    id: req.params.id,
    body: req.body,
    files: req.files,
  });
  res.json({ success: true, data: updated });
});

export const remove = asyncHandler(async (req, res) => {
  await removeService({
    user: req.user,
    id: req.params.id,
  });
  res.json({ success: true, message: "Deleted successfully" });
});
