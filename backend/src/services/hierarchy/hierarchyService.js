/**
 * Hierarchy Service
 *
 * Computes organizational hierarchy based on the User.reportsTo field.
 * All operations are hierarchy-based — no hardcoded role assumptions.
 *
 * Scope concepts:
 *   OWN          – the user themselves
 *   DIRECT_REPORTS – users directly reporting to this user
 *   DESCENDANTS  – all users in the subtree below this user
 *   ORGANIZATION – all users (super_admin only)
 */

import { modelsRegistry } from "../../data/modelRegistry.js";
const { User } = modelsRegistry;
import mongoose from "mongoose";

const toId = (v) => (v instanceof mongoose.Types.ObjectId ? v : new mongoose.Types.ObjectId(String(v)));
const toStr = (v) => (v == null ? null : String(v));

export const ROLE_RANKS = {
  super_admin: 40,
  admin: 30,
  manager: 20,
  auditor: 10,
};

/**
 * Validate that target user does not report to a lower authority user.
 * Higher authority user cannot report to lower authority user.
 * @param {string} targetRole
 * @param {string} newManagerRole
 */
export function validateAuthorityHierarchy(targetRole, newManagerRole) {
  const targetRank = ROLE_RANKS[targetRole] || 0;
  const managerRank = ROLE_RANKS[newManagerRole] || 0;

  if (targetRank > managerRank) {
    const roleLabels = {
      super_admin: "Super Admin",
      admin: "Admin",
      manager: "Manager",
      auditor: "Auditor",
    };
    const tLabel = roleLabels[targetRole] || targetRole;
    const mLabel = roleLabels[newManagerRole] || newManagerRole;
    const err = new Error(
      `Authority Hierarchy Violation: A higher authority user (${tLabel}) cannot report to a lower authority user (${mLabel}).`
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Get users who directly report to userId.
 * @param {string|ObjectId} userId
 * @returns {Promise<ObjectId[]>}
 */
export async function getDirectReports(userId) {
  const users = await User.find({ reportsTo: toId(userId), deleted_at: null })
    .select("_id")
    .lean();
  return users.map((u) => u._id);
}

/**
 * Get all descendant user IDs (BFS) beneath userId.
 * @param {string|ObjectId} userId
 * @returns {Promise<ObjectId[]>}
 */
export async function getDescendants(userId) {
  const result = [];
  const queue = [toId(userId)];
  const visited = new Set([toStr(userId)]);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const children = await User.find({ reportsTo: currentId, deleted_at: null })
      .select("_id")
      .lean();

    for (const child of children) {
      const childStr = toStr(child._id);
      if (!visited.has(childStr)) {
        visited.add(childStr);
        result.push(child._id);
        queue.push(child._id);
      }
    }
  }

  return result;
}

/**
 * Get the ancestry chain from userId up to the root.
 * @param {string|ObjectId} userId
 * @returns {Promise<ObjectId[]>} ordered from immediate parent to root
 */
export async function getAncestors(userId) {
  const result = [];
  const visited = new Set([toStr(userId)]);
  let currentId = toId(userId);

  while (true) {
    const user = await User.findById(currentId).select("reportsTo").lean();
    if (!user || !user.reportsTo) break;

    const parentStr = toStr(user.reportsTo);
    if (visited.has(parentStr)) break; // Circular guard

    visited.add(parentStr);
    result.push(user.reportsTo);
    currentId = user.reportsTo;
  }

  return result;
}

/**
 * Check if potentialAncestorId is an ancestor of userId.
 * Used to prevent reverse hierarchy assignments.
 * @param {string|ObjectId} potentialAncestorId
 * @param {string|ObjectId} userId
 * @returns {Promise<boolean>}
 */
export async function isAncestor(potentialAncestorId, userId) {
  const ancestors = await getAncestors(userId);
  const ancestorStr = toStr(potentialAncestorId);
  return ancestors.some((a) => toStr(a) === ancestorStr);
}

/**
 * Validate that setting userId.reportsTo = newParentId does not create a circular hierarchy.
 * Throws an error if circular or self-assignment detected.
 * @param {string|ObjectId} userId - The user being moved
 * @param {string|ObjectId} newParentId - The proposed new reportsTo
 */
export async function validateNoCircularHierarchy(userId, newParentId) {
  const userStr = toStr(userId);
  const parentStr = toStr(newParentId);

  if (userStr === parentStr) {
    const err = new Error("A user cannot report to themselves.");
    err.statusCode = 400;
    throw err;
  }

  // Check if newParentId is a descendant of userId — that would be circular
  const descendants = await getDescendants(userId);
  const isDescendant = descendants.some((d) => toStr(d) === parentStr);

  if (isDescendant) {
    const err = new Error(
      "Circular hierarchy detected: the target user is already a descendant of this user.",
    );
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Check if requesterId can manage targetId (target must be in requester's subtree).
 * super_admin can manage anyone.
 * @param {object} requester - req.user
 * @param {string|ObjectId} targetId
 * @returns {Promise<boolean>}
 */
export async function canManageUser(requester, targetId) {
  if (!requester) return false;
  if (requester.role === "super_admin" || requester.role === "admin") return true;

  const targetStr = toStr(targetId);
  const requesterStr = toStr(requester._id);
  if (targetStr && requesterStr && targetStr === requesterStr) return true;

  const descendants = await getDescendants(requester._id);
  return descendants.some((d) => toStr(d) === targetStr);
}

/**
 * Build full organization tree as a nested object.
 * Efficient for small-to-medium organizations.
 * @returns {Promise<object[]>} tree rooted at users with reportsTo = null
 */
export async function buildOrgTree() {
  const allUsers = await User.find({ deleted_at: null })
    .select("_id name email role status reportsTo")
    .lean();

  const byId = {};
  const roots = [];

  for (const u of allUsers) {
    byId[toStr(u._id)] = { ...u, children: [] };
  }

  for (const u of allUsers) {
    const node = byId[toStr(u._id)];
    if (u.reportsTo && byId[toStr(u.reportsTo)]) {
      byId[toStr(u.reportsTo)].children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Build org tree scoped to a specific user's subtree (including the user).
 * @param {string|ObjectId} userId
 * @returns {Promise<object|null>}
 */
export async function buildScopedOrgTree(userId) {
  const allUsers = await User.find({ deleted_at: null })
    .select("_id name email role status reportsTo")
    .lean();

  const byId = {};
  for (const u of allUsers) {
    byId[toStr(u._id)] = { ...u, children: [] };
  }

  for (const u of allUsers) {
    const parentStr = toStr(u.reportsTo);
    if (u.reportsTo && byId[parentStr]) {
      byId[parentStr].children.push(byId[toStr(u._id)]);
    }
  }

  return byId[toStr(userId)] || null;
}
