/**
 * Scope Resolver
 *
 * Resolves a hierarchy-based scope to concrete user IDs.
 * Used by work-planner, expense-manager, and team-manager
 * to filter records to authorized users only.
 */

import { modelsRegistry } from "../../data/modelRegistry.js";
const { User, Team } = modelsRegistry;
import { getDirectReports, getDescendants } from "./hierarchyService.js";

export const SCOPES = {
  OWN: "own",
  DIRECT_REPORTS: "direct_reports",
  DESCENDANTS: "descendants",
  ORGANIZATION: "organization",
};

/**
 * Resolve which user IDs the requester is authorized to access.
 *
 * @param {object} user - req.user
 * @param {"own"|"direct_reports"|"descendants"|"organization"} scope
 * @returns {Promise<ObjectId[]>} Array of accessible user IDs (always includes user's own ID for own/descendants/direct_reports)
 */
export async function resolveUserIds(user, scope) {
  const userId = user._id;

  switch (scope) {
    case SCOPES.OWN:
      return [userId];

    case SCOPES.DIRECT_REPORTS: {
      const reports = await getDirectReports(userId);
      const teams = await Team.find({ lead_id: userId, deleted_at: null }).select("_id").lean();
      let teamMemberIds = [];
      if (teams.length > 0) {
        const teamIds = teams.map((t) => t._id);
        const members = await User.find({ team_id: { $in: teamIds }, deleted_at: null }).select("_id").lean();
        teamMemberIds = members.map((m) => m._id);
      }
      const combined = new Set([String(userId), ...reports.map(String), ...teamMemberIds.map(String)]);
      return Array.from(combined);
    }

    case SCOPES.DESCENDANTS: {
      const descendants = await getDescendants(userId);
      const teams = await Team.find({ lead_id: userId, deleted_at: null }).select("_id").lean();
      let teamMemberIds = [];
      if (teams.length > 0) {
        const teamIds = teams.map((t) => t._id);
        const members = await User.find({ team_id: { $in: teamIds }, deleted_at: null }).select("_id").lean();
        teamMemberIds = members.map((m) => m._id);
      }
      const combined = new Set([String(userId), ...descendants.map(String), ...teamMemberIds.map(String)]);
      return Array.from(combined);
    }

    case SCOPES.ORGANIZATION: {
      if (user.role !== "super_admin") {
        // Non super-admins fall back to descendants
        return resolveUserIds(user, SCOPES.DESCENDANTS);
      }
      const allUsers = await User.find({ deleted_at: null }).select("_id").lean();
      return allUsers.map((u) => u._id);
    }

    default:
      return [userId];
  }
}

/**
 * Determine the appropriate scope for a given role.
 * @param {string} role
 * @returns {"own"|"direct_reports"|"descendants"|"organization"}
 */
export function getScopeForRole(role) {
  switch (role) {
    case "super_admin":
      return SCOPES.ORGANIZATION;
    case "admin":
      return SCOPES.DESCENDANTS;
    case "manager":
      return SCOPES.DIRECT_REPORTS;
    case "auditor":
    default:
      return SCOPES.OWN;
  }
}
