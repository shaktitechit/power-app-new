import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getWorkPlansService,
  getWorkPlanService,
  createWorkPlanService,
  updateWorkPlanService,
  deleteWorkPlanService,
  submitWorkPlanService,
  approveWorkPlanService,
  rejectWorkPlanService,
  completeWorkPlanService,
  cancelWorkPlanService,
  getWorkTasksService,
  getWorkTaskService,
  createWorkTaskService,
  updateWorkTaskService,
  completeWorkTaskService,
  reassignWorkTaskService,
  getWorkPlannerDashboardService,
} from "./work-planner.services.js";

// Work Plans
export const getWorkPlans = asyncHandler(async (req, res) => {
  res.json(await getWorkPlansService({ user: req.user, query: req.query }));
});

export const getWorkPlan = asyncHandler(async (req, res) => {
  res.json(await getWorkPlanService({ user: req.user, planId: req.params.id }));
});

export const createWorkPlan = asyncHandler(async (req, res) => {
  const plan = await createWorkPlanService({ user: req.user, body: req.body });
  res.status(201).json({ message: "Work plan created.", plan });
});

export const updateWorkPlan = asyncHandler(async (req, res) => {
  const plan = await updateWorkPlanService({ user: req.user, planId: req.params.id, body: req.body });
  res.json({ message: "Work plan updated.", plan });
});

export const deleteWorkPlan = asyncHandler(async (req, res) => {
  await deleteWorkPlanService({ user: req.user, planId: req.params.id });
  res.json({ message: "Work plan deleted." });
});

export const submitWorkPlan = asyncHandler(async (req, res) => {
  const plan = await submitWorkPlanService({ user: req.user, planId: req.params.id });
  res.json({ message: "Work plan submitted for approval.", plan });
});

export const approveWorkPlan = asyncHandler(async (req, res) => {
  const plan = await approveWorkPlanService({ user: req.user, planId: req.params.id, remarks: req.body.remarks });
  res.json({ message: "Work plan approved.", plan });
});

export const rejectWorkPlan = asyncHandler(async (req, res) => {
  const plan = await rejectWorkPlanService({ user: req.user, planId: req.params.id, reason: req.body.reason });
  res.json({ message: "Work plan rejected.", plan });
});

export const completeWorkPlan = asyncHandler(async (req, res) => {
  const plan = await completeWorkPlanService({ user: req.user, planId: req.params.id });
  res.json({ message: "Work plan completed.", plan });
});

export const cancelWorkPlan = asyncHandler(async (req, res) => {
  const plan = await cancelWorkPlanService({ user: req.user, planId: req.params.id });
  res.json({ message: "Work plan cancelled.", plan });
});

// Work Tasks
export const getWorkTasks = asyncHandler(async (req, res) => {
  res.json(await getWorkTasksService({ user: req.user, query: req.query }));
});

export const getWorkTask = asyncHandler(async (req, res) => {
  res.json(await getWorkTaskService({ user: req.user, taskId: req.params.id }));
});

export const createWorkTask = asyncHandler(async (req, res) => {
  const task = await createWorkTaskService({ user: req.user, body: req.body });
  res.status(201).json({ message: "Task created.", task });
});

export const updateWorkTask = asyncHandler(async (req, res) => {
  const task = await updateWorkTaskService({ user: req.user, taskId: req.params.id, body: req.body });
  res.json({ message: "Task updated.", task });
});

export const completeWorkTask = asyncHandler(async (req, res) => {
  const task = await completeWorkTaskService({
    user: req.user,
    taskId: req.params.id,
    remarks: req.body.remarks,
    actualMinutes: req.body.actualMinutes,
  });
  res.json({ message: "Task marked as completed.", task });
});

export const reassignWorkTask = asyncHandler(async (req, res) => {
  const task = await reassignWorkTaskService({
    user: req.user,
    taskId: req.params.id,
    newAssigneeId: req.body.newAssigneeId,
  });
  res.json({ message: "Task reassigned.", task });
});

// Dashboard
export const getWorkPlannerDashboard = asyncHandler(async (req, res) => {
  res.json(await getWorkPlannerDashboardService({ user: req.user }));
});
