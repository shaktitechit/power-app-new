import { modelsRegistry } from "../../data/modelRegistry.js";
const { User } = modelsRegistry;

import {
  createRecentActivity,
  buildActivityMessage,
} from "../shared/electrical-audit.helpers.js";
import {
  getRequesterRole,
  getAllowedRolesForRequester,
} from "../../services/authorization/userManagement.js";
import { RESOURCES } from "../../constants/resources.js";
import { ACTIONS } from "../../constants/actions.js";

export function isSuperAdmin(user) {
  return user?.role === "super_admin";
}

export function isAdmin(user) {
  return user?.role === "admin" || user?.role === "super_admin";
}

// Helper check for policy scope all
import { getEffectivePolicies, findMatchingPolicies } from "../shared/electrical-audit.helpers.js";
function hasWildcardAll(user) {
  const policies = getEffectivePolicies(user);
  return policies.some(
    (p) => p.resource === "*" && p.actions?.includes("*") && p.scope === "all",
  );
}
function hasPolicyScopeAll(user, resource, action) {
  if (!user) return false;
  if (hasWildcardAll(user)) return true;
  const matches = findMatchingPolicies(
    getEffectivePolicies(user),
    resource,
    action,
  );
  return matches.some((m) => m.scope === "all");
}

export const getUsersService = async ({ user, req }) => {
  const requesterRole = user?.role || getRequesterRole(req);
  const allowedRoles = getAllowedRolesForRequester(requesterRole);

  if (!allowedRoles.length) {
    const error = new Error("Not authorized");
    error.statusCode = 403;
    throw error;
  }

  let query;
  if (isSuperAdmin(user) || requesterRole === "super_admin") {
    query = {};
  } else if (requesterRole === "admin") {
    query = { created_by: user._id };
  } else {
    query = { role: { $in: allowedRoles } };
  }

  return User.find(query)
    .select("-password")
    .populate("created_by", "name email");
};

export const getAssignableUsersService = async ({ user }) => {
  return User.find({
    role: { $nin: ["super_admin"] },
  }).select("-password");
};

export const createUserService = async ({ user, req, body }) => {
  const { name, email, password, role } = body;
  const requesterRole = getRequesterRole(req);
  const allowedRoles = getAllowedRolesForRequester(requesterRole);
  const targetRole = role || "auditor";

  if (!allowedRoles.includes(targetRole)) {
    const error = new Error(`You can create only: ${allowedRoles.join(", ")}`);
    error.statusCode = 403;
    throw error;
  }

  let existingUser = await User.findOne({ email });
  if (existingUser) {
    const error = new Error("User already exists.");
    error.statusCode = 400;
    throw error;
  }

  const newUser = new User({
    name,
    email,
    password,
    role: targetRole,
    created_by: user._id,
  });

  await newUser.save();

  await createRecentActivity({
    actor: user,
    action: "created",
    entity_type: "user",
    entity_id: newUser._id,
    entity_name: newUser.name,
    message: buildActivityMessage({
      actorName: user?.name || "Admin",
      action: "created",
      entityLabel: "user",
      entityName: newUser.name,
    }),
    meta: {
      email: newUser.email,
      role: newUser.role,
      permissions_count: Array.isArray(newUser.permissions)
        ? newUser.permissions.length
        : 0,
    },
  });

  return newUser;
};

export const updateUserService = async ({ user, req, id, body }) => {
  const requesterRole = getRequesterRole(req);
  const allowedRoles = getAllowedRolesForRequester(requesterRole);
  const targetUser = await User.findById(id);

  if (!targetUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!allowedRoles.includes(targetUser.role)) {
    const error = new Error("You are not allowed to update this user role");
    error.statusCode = 403;
    throw error;
  }

  if (requesterRole === "admin" && String(targetUser.created_by) !== String(user._id)) {
    const error = new Error("You can only update users you created");
    error.statusCode = 403;
    throw error;
  }

  const updatedFields = [];

  if (body.name && body.name !== targetUser.name) {
    targetUser.name = body.name;
    updatedFields.push("name");
  }

  if (body.email && body.email !== targetUser.email) {
    targetUser.email = body.email;
    updatedFields.push("email");
  }

  if (body.role && body.role !== targetUser.role) {
    if (!allowedRoles.includes(body.role)) {
      const error = new Error(`You can assign only: ${allowedRoles.join(", ")}`);
      error.statusCode = 403;
      throw error;
    }
    targetUser.role = body.role;
    updatedFields.push("role");
  }

  if (typeof body.password === "string" && body.password.trim()) {
    targetUser.password = body.password.trim();
    updatedFields.push("password");
  }

  const updatedUser = await targetUser.save();

  await createRecentActivity({
    actor: user,
    action: "updated",
    entity_type: "user",
    entity_id: updatedUser._id,
    entity_name: updatedUser.name,
    message: buildActivityMessage({
      actorName: user?.name || "Admin",
      action: "updated",
      entityLabel: "user",
      entityName: updatedUser.name,
    }),
    meta: {
      updated_fields: updatedFields,
      email: updatedUser.email,
      role: updatedUser.role,
      permissions_count: Array.isArray(updatedUser.permissions)
        ? updatedUser.permissions.length
        : 0,
    },
  });

  return updatedUser;
};

export const deleteUserService = async ({ user, req, id }) => {
  const requesterRole = getRequesterRole(req);
  const allowedRoles = getAllowedRolesForRequester(requesterRole);
  const targetUser = await User.findById(id);

  if (!targetUser) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (!allowedRoles.includes(targetUser.role)) {
    const error = new Error("You are not allowed to delete this user role");
    error.statusCode = 403;
    throw error;
  }

  if (requesterRole === "admin" && String(targetUser.created_by) !== String(user._id)) {
    const error = new Error("You can only delete users you created");
    error.statusCode = 403;
    throw error;
  }

  const userName = targetUser.name;
  const userEmail = targetUser.email;
  const userRole = targetUser.role;

  await targetUser.softDelete();

  await createRecentActivity({
    actor: user,
    action: "deleted",
    entity_type: "user",
    entity_id: targetUser._id,
    entity_name: userName,
    message: buildActivityMessage({
      actorName: user?.name || "Admin",
      action: "deleted",
      entityLabel: "user",
      entityName: userName,
    }),
    meta: {
      email: userEmail,
      role: userRole,
    },
  });

  return true;
};
