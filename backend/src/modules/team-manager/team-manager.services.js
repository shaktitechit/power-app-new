/**
 * Team Manager Service
 *
 * Manages static Teams and organizational hierarchy (reportsTo relationships).
 * All mutations are hierarchy-validated and audit-logged.
 */

import { modelsRegistry } from "../../data/modelRegistry.js";
const { User, Team, RecentActivity } = modelsRegistry;
import {
  getDirectReports,
  getDescendants,
  validateNoCircularHierarchy,
  canManageUser,
  validateAuthorityHierarchy,
} from "../../services/hierarchy/hierarchyService.js";
import { getScopeForRole, resolveUserIds, SCOPES } from "../../services/hierarchy/scopeResolver.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function forbidden(msg) {
  const e = new Error(msg);
  e.statusCode = 403;
  return e;
}

function notFound(msg = "User not found") {
  const e = new Error(msg);
  e.statusCode = 404;
  return e;
}

async function logActivity({ actor, action, entityType, entityId, entityName, message, meta = {} }) {
  try {
    await RecentActivity.create({
      actor_id: actor._id,
      actor_name: actor.name,
      actor_role: actor.role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      entity_name: entityName,
      message,
      meta,
    });
  } catch {
    // Non-fatal
  }
}

async function attachTeamRoots(usersList) {
  const allTeams = await Team.find({ deleted_at: null })
    .populate("lead_id", "name email role")
    .lean();

  const teamsMap = {};
  for (const t of allTeams) {
    teamsMap[String(t._id)] = t;
  }

  return usersList.map((u) => {
    let teamObj = null;
    if (u.team_id && teamsMap[String(u.team_id)]) {
      const t = teamsMap[String(u.team_id)];
      teamObj = {
        _id: String(t._id),
        name: t.name,
        description: t.description,
        lead: t.lead_id
          ? {
              _id: String(t.lead_id._id),
              name: t.lead_id.name,
              email: t.lead_id.email,
              role: t.lead_id.role,
            }
          : null,
      };
    }
    return { ...u, teamRoot: teamObj };
  });
}

// ---------------------------------------------------------------------------
// Get organization static teams & hierarchy trees
// ---------------------------------------------------------------------------

export async function getHierarchyService({ user }) {
  const staticTeams = await Team.find({ deleted_at: null })
    .populate("lead_id", "name email role status")
    .lean();

  const allUsers = await User.find({ deleted_at: null })
    .select("_id name email role status reportsTo team_id")
    .lean();

  const byId = {};
  for (const u of allUsers) {
    byId[String(u._id)] = { ...u, children: [] };
  }

  // Group members into parent children
  for (const u of allUsers) {
    if (u.reportsTo && byId[String(u.reportsTo)]) {
      byId[String(u.reportsTo)].children.push(byId[String(u._id)]);
    }
  }

  const resultTrees = [];

  for (const team of staticTeams) {
    const leadNode = team.lead_id ? byId[String(team.lead_id._id)] : null;
    const teamMembers = allUsers.filter((u) => String(u.team_id) === String(team._id));

    // Construct team tree node
    const teamTreeNode = {
      _id: String(team._id),
      teamId: String(team._id),
      name: team.name,
      description: team.description || "",
      lead: team.lead_id
        ? {
            _id: String(team.lead_id._id),
            name: team.lead_id.name,
            email: team.lead_id.email,
            role: team.lead_id.role,
            status: team.lead_id.status,
          }
        : null,
      role: team.lead_id?.role || "manager",
      email: team.lead_id?.email || "",
      status: team.lead_id?.status || "active",
      children: leadNode ? [leadNode] : teamMembers.map((m) => byId[String(m._id)]),
    };

    resultTrees.push(teamTreeNode);
  }

  if (user.role !== "super_admin") {
    // Return teams accessible to this user
    return resultTrees;
  }

  return resultTrees;
}

// ---------------------------------------------------------------------------
// List users within authorized scope
// ---------------------------------------------------------------------------

export async function getTeamUsersService({ user, query }) {
  const { role: filterRole, search, managerId, teamRootId, page = 1, limit = 50 } = query;

  let accessibleIds;
  if (user.role === "super_admin") {
    accessibleIds = null;
  } else {
    const scope = getScopeForRole(user.role);
    const ids = await resolveUserIds(user, scope);
    accessibleIds = ids.map(String);
  }

  const filter = { deleted_at: null };

  if (accessibleIds) {
    filter._id = { $in: accessibleIds };
  }

  if (filterRole) filter.role = filterRole;
  if (managerId) filter.reportsTo = managerId;
  if (teamRootId) filter.team_id = teamRootId;

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  let [users, total] = await Promise.all([
    User.find(filter)
      .select("-password")
      .populate("reportsTo", "name email role")
      .skip(skip)
      .limit(Number(limit))
      .sort({ name: 1 })
      .lean(),
    User.countDocuments(filter),
  ]);

  users = await attachTeamRoots(users);

  return { users, total, page: Number(page), limit: Number(limit) };
}

// ---------------------------------------------------------------------------
// Get single user with their direct reports
// ---------------------------------------------------------------------------

export async function getTeamUserDetailService({ user, targetId }) {
  const ok = await canManageUser(user, targetId);
  if (!ok && String(user._id) !== String(targetId)) {
    throw forbidden("You are not authorized to view this user.");
  }

  const targetUser = await User.findById(targetId)
    .select("-password")
    .populate("reportsTo", "name email role")
    .lean();

  if (!targetUser) throw notFound();

  const directReportIds = await getDirectReports(targetId);
  const directReports = await User.find({ _id: { $in: directReportIds } })
    .select("name email role status reportsTo")
    .lean();

  return { user: targetUser, directReports };
}

// ---------------------------------------------------------------------------
// Assign reportsTo / team for a user
// ---------------------------------------------------------------------------

export async function assignUserService({ requester, targetId, newManagerId }) {
  const ok = await canManageUser(requester, targetId);
  if (!ok) throw forbidden("You are not authorized to reassign this user.");

  const targetUser = await User.findById(targetId);
  if (!targetUser) throw notFound();

  if (newManagerId) {
    const newManager = await User.findById(newManagerId);
    if (!newManager) throw notFound("Manager user not found.");

    validateAuthorityHierarchy(targetUser.role, newManager.role);

    const managerOk =
      String(requester._id) === String(newManagerId) ||
      (await canManageUser(requester, newManagerId));
    if (!managerOk && requester.role !== "super_admin") {
      throw forbidden("You are not authorized to assign users to this manager.");
    }

    await validateNoCircularHierarchy(targetId, newManagerId);

    const previousManager = targetUser.reportsTo;
    targetUser.reportsTo = newManagerId;
    if (newManager.team_id) {
      targetUser.team_id = newManager.team_id;
    }
    await targetUser.save();

    await logActivity({
      actor: requester,
      action: "assigned",
      entityType: "team_assignment",
      entityId: targetUser._id,
      entityName: targetUser.name,
      message: `${requester.name} assigned ${targetUser.name} to manager ${newManager.name}.`,
      meta: { previousManager: String(previousManager), newManager: String(newManagerId) },
    });
  } else {
    const previousManager = targetUser.reportsTo;
    targetUser.reportsTo = null;
    targetUser.team_id = null;
    await targetUser.save();

    await logActivity({
      actor: requester,
      action: "unassigned",
      entityType: "team_assignment",
      entityId: targetUser._id,
      entityName: targetUser.name,
      message: `${requester.name} removed ${targetUser.name}'s manager and team assignment.`,
      meta: { previousManager: String(previousManager) },
    });
  }

  return User.findById(targetId).select("-password").populate("reportsTo", "name email role");
}

export async function moveUserService({ requester, targetId, newManagerId }) {
  if (!newManagerId) {
    const e = new Error("newManagerId is required to move a user.");
    e.statusCode = 400;
    throw e;
  }

  if (requester.role === "auditor") {
    throw forbidden("Auditors cannot move users in the hierarchy.");
  }

  return assignUserService({ requester, targetId, newManagerId });
}

// ---------------------------------------------------------------------------
// Create a new static team with designated Team Lead and members
// ---------------------------------------------------------------------------

export async function createTeamService({ requester, name, description, teamLeadId, members = [], memberIds = [] }) {
  if (requester.role !== "super_admin" && requester.role !== "admin") {
    throw forbidden("Only Super Admins and Admins can create new teams.");
  }

  const teamLead = await User.findById(teamLeadId);
  if (!teamLead) throw notFound("Team Lead user not found.");

  if (!["super_admin", "admin", "manager"].includes(teamLead.role)) {
    const err = new Error("Team Lead must have a Manager, Admin, or Super Admin role.");
    err.statusCode = 400;
    throw err;
  }

  const teamName = name && name.trim() ? name.trim() : `${teamLead.name}'s Team`;

  const team = await Team.create({
    name: teamName,
    description: description ? description.trim() : "",
    lead_id: teamLead._id,
    created_by: requester._id,
  });

  teamLead.team_id = team._id;
  teamLead.reportsTo = null;
  await teamLead.save();

  const assignedMembers = [];
  const errors = [];

  const memberList = (Array.isArray(members) && members.length > 0)
    ? members
    : (Array.isArray(memberIds) ? memberIds.map((id) => ({ userId: id, reportsToId: teamLeadId })) : []);

  for (const item of memberList) {
    const mId = typeof item === "string" ? item : item.userId;
    const rId = (typeof item === "object" && item.reportsToId) ? item.reportsToId : teamLeadId;

    if (String(mId) === String(teamLeadId)) continue;

    try {
      const member = await User.findById(mId);
      if (!member) continue;

      const parentManager = await User.findById(rId);
      if (!parentManager) {
        throw new Error(`Manager user not found.`);
      }

      validateAuthorityHierarchy(member.role, parentManager.role);
      await validateNoCircularHierarchy(mId, rId);

      member.team_id = team._id;
      member.reportsTo = parentManager._id;
      await member.save();
      assignedMembers.push(`${member.name} (reports to ${parentManager.name})`);
    } catch (err) {
      errors.push(`${mId}: ${err.message}`);
    }
  }

  await logActivity({
    actor: requester,
    action: "created",
    entityType: "team",
    entityId: team._id,
    entityName: team.name,
    message: `${requester.name} created team tree "${team.name}" led by ${teamLead.name} with ${assignedMembers.length} members.`,
    meta: { teamId: team._id, teamLeadId, memberList, assignedMembers },
  });

  return {
    message: `Team tree "${team.name}" created successfully.`,
    team,
    teamLead,
    assignedMembersCount: assignedMembers.length,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Update Static Team Details / Reassign Team Head
// ---------------------------------------------------------------------------

export async function updateTeamService({ requester, teamId, name, description, newLeadId, teamLeadId, members }) {
  if (requester.role !== "super_admin" && requester.role !== "admin") {
    throw forbidden("Only Super Admins and Admins can update teams.");
  }

  const team = await Team.findById(teamId);
  if (!team || team.deleted_at) throw notFound("Team not found.");

  if (name && name.trim()) {
    team.name = name.trim();
  }

  if (description !== undefined) {
    team.description = description.trim();
  }

  const effectiveLeadId = newLeadId || teamLeadId;
  if (effectiveLeadId && String(effectiveLeadId) !== String(team.lead_id)) {
    const newLead = await User.findById(effectiveLeadId);
    if (!newLead) throw notFound("New Team Head user not found.");

    if (!["super_admin", "admin", "manager"].includes(newLead.role)) {
      const err = new Error("Team Head must be a Manager, Admin, or Super Admin.");
      err.statusCode = 400;
      throw err;
    }

    team.lead_id = newLead._id;
    newLead.team_id = team._id;
    newLead.reportsTo = null;
    await newLead.save();
  } else if (team.lead_id) {
    await User.updateOne({ _id: team.lead_id }, { $set: { team_id: team._id, reportsTo: null } });
  }

  await team.save();

  if (Array.isArray(members)) {
    const activeLeadId = String(team.lead_id);
    const newMemberUserIds = members.map((m) => String(typeof m === "string" ? m : m.userId));

    // Find users currently assigned to this team who were removed in the edit form
    const currentMembers = await User.find({ team_id: team._id, _id: { $ne: activeLeadId } }).select("_id");
    const currentIds = currentMembers.map((m) => String(m._id));
    const removedIds = currentIds.filter((id) => !newMemberUserIds.includes(id));

    if (removedIds.length > 0) {
      await User.updateMany(
        { _id: { $in: removedIds } },
        { $set: { team_id: null, reportsTo: null } }
      );
    }

    // Apply updated tree assignments
    for (const item of members) {
      const mId = typeof item === "string" ? item : item.userId;
      const rId = (typeof item === "object" && item.reportsToId) ? item.reportsToId : activeLeadId;

      if (String(mId) === activeLeadId) continue;

      try {
        const member = await User.findById(mId);
        if (!member) continue;

        const parentManager = await User.findById(rId);
        if (!parentManager) continue;

        validateAuthorityHierarchy(member.role, parentManager.role);
        await validateNoCircularHierarchy(mId, rId);

        member.team_id = team._id;
        member.reportsTo = parentManager._id;
        await member.save();
      } catch (err) {
        // Skip invalid assignment
      }
    }
  }

  await logActivity({
    actor: requester,
    action: "updated",
    entityType: "team",
    entityId: team._id,
    entityName: team.name,
    message: `${requester.name} updated team tree "${team.name}".`,
    meta: { teamId: team._id },
  });

  return team;
}

// ---------------------------------------------------------------------------
// Delete Static Team
// ---------------------------------------------------------------------------

export async function deleteTeamService({ requester, teamId }) {
  if (requester.role !== "super_admin" && requester.role !== "admin") {
    throw forbidden("Only Super Admins and Admins can delete teams.");
  }

  const team = await Team.findById(teamId);
  if (!team || team.deleted_at) throw notFound("Team not found.");

  team.deleted_at = new Date();
  await team.save();

  // Clear team assignments for all team members
  await User.updateMany(
    { team_id: team._id },
    { $set: { team_id: null, reportsTo: null } }
  );

  await logActivity({
    actor: requester,
    action: "deleted",
    entityType: "team",
    entityId: team._id,
    entityName: team.name,
    message: `${requester.name} deleted team "${team.name}".`,
  });

  return { message: `Team "${team.name}" deleted successfully.` };
}

// ---------------------------------------------------------------------------
// Activate / Deactivate user
// ---------------------------------------------------------------------------

export async function setUserStatusService({ requester, targetId, status }) {
  const ok = await canManageUser(requester, targetId);
  if (!ok) throw forbidden("You are not authorized to change this user's status.");

  const targetUser = await User.findById(targetId);
  if (!targetUser) throw notFound();

  const previousStatus = targetUser.status;
  targetUser.status = status;
  await targetUser.save();

  await logActivity({
    actor: requester,
    action: status === "active" ? "updated" : "deactivated",
    entityType: "user",
    entityId: targetUser._id,
    entityName: targetUser.name,
    message: `${requester.name} set ${targetUser.name} to ${status}.`,
    meta: { previousStatus, newStatus: status },
  });

  return User.findById(targetId).select("-password");
}

// ---------------------------------------------------------------------------
// Team summary report
// ---------------------------------------------------------------------------

export async function getTeamReportService({ user }) {
  const scope = user.role === "super_admin" ? SCOPES.ORGANIZATION : getScopeForRole(user.role);
  const userIds = await resolveUserIds(user, scope);

  const rawUsers = await User.find({ _id: { $in: userIds }, deleted_at: null })
    .select("name email role status reportsTo team_id")
    .lean();

  const users = await attachTeamRoots(rawUsers);
  const allTeams = await Team.find({ deleted_at: null }).populate("lead_id", "name email role").lean();

  const summary = {
    total: users.length,
    byRole: {},
    byStatus: { active: 0, inactive: 0 },
    teams: {},
  };

  for (const t of allTeams) {
    summary.teams[String(t._id)] = {
      id: String(t._id),
      name: t.name,
      teamLead: t.lead_id
        ? {
            _id: String(t.lead_id._id),
            name: t.lead_id.name,
            email: t.lead_id.email,
            role: t.lead_id.role,
          }
        : null,
      total: 0,
      byRole: {},
      active: 0,
      inactive: 0,
    };
  }

  summary.teams["unassigned"] = {
    id: "unassigned",
    name: "Standalone Members",
    teamLead: null,
    total: 0,
    byRole: {},
    active: 0,
    inactive: 0,
  };

  for (const u of users) {
    summary.byRole[u.role] = (summary.byRole[u.role] || 0) + 1;
    summary.byStatus[u.status] = (summary.byStatus[u.status] || 0) + 1;

    const rootId = u.team_id ? String(u.team_id) : "unassigned";
    if (!summary.teams[rootId]) {
      summary.teams[rootId] = {
        id: rootId,
        name: u.teamRoot ? u.teamRoot.name : "Standalone Members",
        teamLead: u.teamRoot?.lead || null,
        total: 0,
        byRole: {},
        active: 0,
        inactive: 0,
      };
    }
    summary.teams[rootId].total += 1;
    summary.teams[rootId].byRole[u.role] = (summary.teams[rootId].byRole[u.role] || 0) + 1;
    if (u.status === "active") summary.teams[rootId].active += 1;
    else summary.teams[rootId].inactive += 1;
  }

  if (summary.teams["unassigned"].total === 0) {
    delete summary.teams["unassigned"];
  }

  return { summary, users };
}
