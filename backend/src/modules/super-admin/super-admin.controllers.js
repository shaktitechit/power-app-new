import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getUsersService,
  getAssignableUsersService,
  createUserService,
  updateUserService,
  deleteUserService,
} from "./super-admin.services.js";

export const getUsers = asyncHandler(async (req, res) => {
  const users = await getUsersService({
    user: req.user,
    req,
  });
  return res.json(users);
});

export const getAssignableUsers = asyncHandler(async (req, res) => {
  const users = await getAssignableUsersService({
    user: req.user,
  });
  return res.json(users);
});

export const createUser = asyncHandler(async (req, res) => {
  const user = await createUserService({
    user: req.user,
    req,
    body: req.body,
  });
  return res.status(201).json({
    message: "User Created successfully.",
    user,
  });
});

export const updateUser = asyncHandler(async (req, res) => {
  const user = await updateUserService({
    user: req.user,
    req,
    id: req.params.id,
    body: req.body,
  });
  return res.status(200).json({
    message: "User updated successfully",
    user,
  });
});

export const deleteUser = asyncHandler(async (req, res) => {
  await deleteUserService({
    user: req.user,
    req,
    id: req.params.id,
  });
  return res.json({
    message: "User deleted successfully",
  });
});
