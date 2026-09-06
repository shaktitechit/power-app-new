import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getHierarchyService,
  getTeamUsersService,
  getTeamUserDetailService,
  assignUserService,
  moveUserService,
  createTeamService,
  updateTeamService,
  deleteTeamService,
  setUserStatusService,
  getTeamReportService,
} from "./team-manager.services.js";

export const getHierarchy = asyncHandler(async (req, res) => {
  const tree = await getHierarchyService({ user: req.user });
  res.json(tree);
});

export const getTeamUsers = asyncHandler(async (req, res) => {
  const data = await getTeamUsersService({ user: req.user, query: req.query });
  res.json(data);
});

export const getTeamUserDetail = asyncHandler(async (req, res) => {
  const data = await getTeamUserDetailService({ user: req.user, targetId: req.params.id });
  res.json(data);
});

export const assignUser = asyncHandler(async (req, res) => {
  const { newManagerId } = req.body;
  const user = await assignUserService({
    requester: req.user,
    targetId: req.params.id,
    newManagerId,
  });
  res.json({ message: "User assigned successfully.", user });
});

export const moveUser = asyncHandler(async (req, res) => {
  const { newManagerId } = req.body;
  const user = await moveUserService({
    requester: req.user,
    targetId: req.params.id,
    newManagerId,
  });
  res.json({ message: "User moved successfully.", user });
});

export const createTeam = asyncHandler(async (req, res) => {
  const { name, description, teamLeadId, memberIds } = req.body;
  const result = await createTeamService({
    requester: req.user,
    name,
    description,
    teamLeadId,
    memberIds,
  });
  res.json(result);
});

export const updateTeam = asyncHandler(async (req, res) => {
  const { name, description, newLeadId, teamLeadId, members } = req.body;
  const team = await updateTeamService({
    requester: req.user,
    teamId: req.params.id,
    name,
    description,
    newLeadId,
    teamLeadId,
    members,
  });
  res.json({ message: "Team updated successfully.", team });
});

export const deleteTeam = asyncHandler(async (req, res) => {
  const result = await deleteTeamService({
    requester: req.user,
    teamId: req.params.id,
  });
  res.json(result);
});

export const activateUser = asyncHandler(async (req, res) => {
  const user = await setUserStatusService({
    requester: req.user,
    targetId: req.params.id,
    status: "active",
  });
  res.json({ message: "User activated.", user });
});

export const deactivateUser = asyncHandler(async (req, res) => {
  const user = await setUserStatusService({
    requester: req.user,
    targetId: req.params.id,
    status: "inactive",
  });
  res.json({ message: "User deactivated.", user });
});

export const getTeamReport = asyncHandler(async (req, res) => {
  const data = await getTeamReportService({ user: req.user });
  res.json(data);
});
