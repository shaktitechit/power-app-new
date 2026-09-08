/**
 * Work Planner Service
 *
 * Manages WorkPlan and WorkTask lifecycle.
 * Hierarchy scope is enforced — users can only access resources
 * belonging to themselves and their descendants.
 */

import { modelsRegistry } from "../../data/modelRegistry.js";
const { Notification, RecentActivity } = modelsRegistry;
import WorkPlan from "../../models/workPlan.js";
import WorkTask from "../../models/workTask.js";
import Expense from "../../models/expense.js";
import mongoose from "mongoose";
import { canManageUser } from "../../services/hierarchy/hierarchyService.js";
import { getScopeForRole, resolveUserIds } from "../../services/hierarchy/scopeResolver.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function forbidden(msg = "Not authorized") {
  const e = new Error(msg);
  e.statusCode = 403;
  return e;
}

function notFound(msg = "Not found") {
  const e = new Error(msg);
  e.statusCode = 404;
  return e;
}

function badRequest(msg) {
  const e = new Error(msg);
  e.statusCode = 400;
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
  } catch { /* Non-fatal */ }
}

async function sendNotification({ recipientId, senderId, title, message, referenceId }) {
  try {
    await Notification.create({
      recipient: recipientId,
      sender: senderId,
      title,
      message,
      type: "workplan",
      referenceId,
    });
  } catch { /* Non-fatal */ }
}

// ---------------------------------------------------------------------------
// Work Plans
// ---------------------------------------------------------------------------

export async function getWorkPlansService({ user, query }) {
  const { status, ownerId, planType, date, startDate, endDate, tab, page = 1, limit = 50 } = query;

  const scope = getScopeForRole(user.role);
  const accessibleIds = await resolveUserIds(user, scope);

  const filter = {
    owner: { $in: accessibleIds },
    deleted_at: null,
  };

  if (ownerId) {
    if (ownerId === "my") {
      filter.owner = user._id;
    } else if (ownerId === "team") {
      filter.owner = {
        $in: accessibleIds.filter((id) => String(id) !== String(user._id)),
      };
    } else if (ownerId !== "all" && accessibleIds.some((id) => String(id) === String(ownerId))) {
      filter.owner = ownerId;
    }
  } else if (tab === "my") {
    filter.owner = user._id;
  } else if (tab === "team") {
    filter.owner = {
      $in: accessibleIds.filter((id) => String(id) !== String(user._id)),
    };
  } else if (tab === "today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    filter.$or = [
      { date: { $gte: todayStart, $lte: todayEnd } },
      { "period.startDate": { $gte: todayStart, $lte: todayEnd } },
    ];
  } else if (tab === "all") {
    filter.owner = { $in: accessibleIds };
  }

  if (status && status !== "all") {
    filter.status = status;
  }

  if (planType && planType !== "all") {
    filter.planType = planType;
  }

  if (startDate && endDate) {
    const s = new Date(startDate);
    s.setHours(0, 0, 0, 0);
    const e = new Date(endDate);
    e.setHours(23, 59, 59, 999);
    filter.$or = [
      { date: { $gte: s, $lte: e } },
      { "period.startDate": { $gte: s, $lte: e } },
    ];
  } else if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    filter.date = { $gte: startOfDay, $lte: endOfDay };
  }

  const parsedLimit = Math.min(Number(limit) || 50, 1000);
  const skip = (Number(page) - 1) * parsedLimit;
  const [plans, total] = await Promise.all([
    WorkPlan.find(filter)
      .populate("owner", "name email role")
      .populate("created_by", "name email")
      .populate("visits.facility", "name city")
      .populate("approval.approvedBy", "name email role")
      .populate("approval.rejectedBy", "name email role")
      .sort({ date: -1, created_at: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    WorkPlan.countDocuments(filter),
  ]);

  return { plans, total, page: Number(page), limit: parsedLimit };
}

export async function getWorkPlanService({ user, planId }) {
  const plan = await WorkPlan.findById(planId)
    .populate("owner", "name email role")
    .populate("created_by", "name email")
    .populate("visits.facility", "name city address")
    .populate("approval.requiredFrom", "name email role")
    .populate("approval.approvedBy", "name email role")
    .populate("approval.rejectedBy", "name email role")
    .lean();

  if (!plan) throw notFound("Work plan not found.");

  const scope = getScopeForRole(user.role);
  const accessibleIds = (await resolveUserIds(user, scope)).map(String);
  if (!accessibleIds.includes(String(plan.owner._id || plan.owner))) {
    throw forbidden("You are not authorized to view this work plan.");
  }

  // Fetch expenses linked to this work plan
  const expenses = await Expense.find({
    workPlanId: planId,
    deleted_at: null,
  })
    .populate("employeeId", "name email role")
    .populate("approval.approvedBy", "name email role")
    .populate("approval.rejectedBy", "name email role")
    .sort({ expenseDate: -1 })
    .lean();

  return { ...plan, expenses };
}

function sanitizeFacilityId(fac) {
  if (!fac) return null;
  if (typeof fac === "object" && fac._id && mongoose.Types.ObjectId.isValid(fac._id)) {
    return String(fac._id);
  }
  const s = String(fac).trim();
  if (!s || s === "[object Object]" || s === "null" || s === "undefined" || s === "me" || s === "self" || !mongoose.Types.ObjectId.isValid(s)) {
    return null;
  }
  return s;
}

function isPlanDateTooFarInPast(planDateRaw, { bypass = false } = {}) {
  if (bypass) return false;
  if (!planDateRaw) return false;
  const planDayStart = new Date(planDateRaw);
  if (isNaN(planDayStart.getTime())) return false;
  planDayStart.setHours(0, 0, 0, 0);
  const minAllowed = new Date();
  minAllowed.setHours(0, 0, 0, 0);
  minAllowed.setDate(minAllowed.getDate() - 3);
  return planDayStart.getTime() < minAllowed.getTime();
}

export async function createWorkPlanService({ user, body }) {
  const { ownerId, title, description, planType, date, leaveReason, visits, works, period } = body;

  let owner = (ownerId && ownerId !== "me" && ownerId !== "self" && mongoose.Types.ObjectId.isValid(ownerId))
    ? String(ownerId)
    : String(user._id);

  if (String(owner) !== String(user._id)) {
    const ok = await canManageUser(user, owner);
    if (!ok) throw forbidden("You are not authorized to create plans for this user.");
  }

  const parseDate = (d) => {
    if (!d) return null;
    const parsed = new Date(d);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  const planDate = parseDate(date) || new Date();
  const startDate = parseDate(period?.startDate) || planDate;
  const endDate = parseDate(period?.endDate) || planDate;

  if (isPlanDateTooFarInPast(planDate, { bypass: user.role === "super_admin" })) {
    throw badRequest("Only Super Admin can create work plans more than 3 days in the past.");
  }

  // Duplicate Check: Prevent multiple active work plans for the same user on the same date
  const startOfDay = new Date(planDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(planDate);
  endOfDay.setHours(23, 59, 59, 999);

  const existingPlan = await WorkPlan.findOne({
    owner,
    $or: [
      { date: { $gte: startOfDay, $lte: endOfDay } },
      { plan_date: { $gte: startOfDay, $lte: endOfDay } },
    ],
    status: { $ne: "cancelled" },
    deleted_at: null,
  });

  if (existingPlan) {
    const formattedDate = planDate.toISOString().split("T")[0];
    throw badRequest(`A work plan already exists for date ${formattedDate}. Only 1 work plan per day is allowed.`);
  }

  const sanitizedVisits = Array.isArray(visits)
    ? visits.map((v) => ({
        ...v,
        facility: sanitizeFacilityId(v.facility),
        facilityName: v.facilityName || "",
        location: v.location || "",
        clientName: v.clientName || "",
        clientContactNumber: v.clientContactNumber || "",
        clientEmail: v.clientEmail || "",
        purpose: v.purpose || "",
        expectedOutcome: v.expectedOutcome || "",
        status: ["scheduled", "in_progress", "completed", "cancelled"].includes(v.status)
          ? v.status
          : "scheduled",
      }))
    : [];

  const sanitizedWorks = Array.isArray(works)
    ? works.map((w) => ({
        title: w.title || "Untitled Task",
        category: w.category || "general",
        description: w.description || "",
        estimatedHours: Number(w.estimatedHours) > 0 ? Number(w.estimatedHours) : 1,
        status: ["pending", "in_progress", "completed"].includes(w.status) ? w.status : "pending",
      }))
    : [];

  const validPlanType = ["visits", "work_from_office", "work_from_home", "leave"].includes(planType)
    ? planType
    : "work_from_office";

  const plan = await WorkPlan.create({
    owner,
    created_by: user._id,
    title: title || `Work Plan - ${planDate.toISOString().split("T")[0]}`,
    description: description || "",
    planType: validPlanType,
    date: planDate,
    plan_date: planDate,
    leaveReason: leaveReason || "",
    visits: sanitizedVisits,
    works: sanitizedWorks,
    period: {
      type: period?.type || "daily",
      startDate,
      endDate,
    },
    status: "planned",
    approval: {},
  });

  await logActivity({
    actor: user,
    action: "created",
    entityType: "work_plan",
    entityId: plan._id,
    entityName: plan.title,
    message: `${user.name} created a work plan (${plan.planType}).`,
    meta: { owner, planType: validPlanType, date: planDate },
  });

  return plan;
}

function visitStructureSnapshot(v = {}) {
  return JSON.stringify({
    facility: String(v.facility?._id || v.facility || ""),
    facilityName: v.facilityName || "",
    location: v.location || "",
    clientName: v.clientName || "",
    clientContactNumber: v.clientContactNumber || "",
    clientEmail: v.clientEmail || "",
    purpose: v.purpose || "",
    expectedOutcome: v.expectedOutcome || "",
  });
}

function workStructureSnapshot(w = {}) {
  return JSON.stringify({
    title: w.title || "",
    description: w.description || "",
    category: w.category || "",
    estimatedHours: Number(w.estimatedHours) || 0,
  });
}

function isStructureWindowExpired(planDateRaw, { bypass = false } = {}) {
  if (bypass) return false;
  if (!planDateRaw) return false;
  const planDayStart = new Date(planDateRaw);
  if (isNaN(planDayStart.getTime())) return false;
  planDayStart.setHours(0, 0, 0, 0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (planDayStart.getTime() >= todayStart.getTime()) return false;
  const maxDate = new Date(planDayStart);
  maxDate.setDate(maxDate.getDate() + 3);
  maxDate.setHours(23, 59, 59, 999);
  return new Date() > maxDate;
}

export async function updateWorkPlanService({ user, planId, body }) {
  const plan = await WorkPlan.findById(planId);
  if (!plan) throw notFound("Work plan not found.");
  if (["completed", "cancelled"].includes(plan.status)) {
    throw badRequest("Cannot modify a completed or cancelled work plan.");
  }

  const ownerIdStr = String(plan.owner?._id || plan.owner);
  const createdByStr = String(plan.created_by?._id || plan.created_by);
  const userIdStr = String(user._id);
  const isSenior = (await canManageUser(user, ownerIdStr)) || user.role === "super_admin" || user.role === "admin";

  const ok = ownerIdStr === userIdStr || createdByStr === userIdStr || isSenior;
  if (!ok) throw forbidden("You are not authorized to update this work plan.");

  const planDateRaw = plan.date || plan.plan_date || plan.period?.startDate;
  const structureExpired = isStructureWindowExpired(planDateRaw, { bypass: user.role === "super_admin" });

  if (structureExpired) {
    const metadataTouched =
      body.title !== undefined ||
      body.description !== undefined ||
      body.planType !== undefined ||
      body.date !== undefined ||
      body.leaveReason !== undefined ||
      body.period !== undefined;
    if (metadataTouched) {
      throw badRequest("Plan details can only be edited within 3 days after the work plan date.");
    }

    if (body.visits !== undefined && Array.isArray(body.visits)) {
      const current = plan.visits || [];
      if (body.visits.length !== current.length) {
        throw badRequest("Visits can only be added or removed within 3 days after the work plan date.");
      }
      for (let i = 0; i < current.length; i++) {
        if (visitStructureSnapshot(current[i]) !== visitStructureSnapshot(body.visits[i])) {
          throw badRequest("Visits can only be edited within 3 days after the work plan date.");
        }
      }
    }

    if (body.works !== undefined && Array.isArray(body.works)) {
      const current = plan.works || [];
      if (body.works.length !== current.length) {
        throw badRequest("Work items can only be added or removed within 3 days after the work plan date.");
      }
      for (let i = 0; i < current.length; i++) {
        if (workStructureSnapshot(current[i]) !== workStructureSnapshot(body.works[i])) {
          throw badRequest("Work items can only be edited within 3 days after the work plan date.");
        }
      }
    }
  }

  const { title, description, planType, date, leaveReason, visits, works, period } = body;
  if (title !== undefined) plan.title = title;
  if (description !== undefined) plan.description = description;
  if (planType !== undefined) plan.planType = planType;
  if (date !== undefined) {
    const updatedDate = new Date(date);
    if (!isNaN(updatedDate.getTime())) {
      if (isPlanDateTooFarInPast(updatedDate, { bypass: user.role === "super_admin" })) {
        throw badRequest("Only Super Admin can set a work plan date more than 3 days in the past.");
      }
      plan.date = updatedDate;
      plan.plan_date = updatedDate;
    }
  }
  if (leaveReason !== undefined) plan.leaveReason = leaveReason;
  if (visits !== undefined && Array.isArray(visits)) {
    plan.visits = visits.map((v) => ({
      ...v,
      facility: sanitizeFacilityId(v.facility),
    }));
  }
  if (works !== undefined && Array.isArray(works)) plan.works = works;
  if (period) {
    if (period.type) plan.period.type = period.type;
    if (period.startDate) plan.period.startDate = new Date(period.startDate);
    if (period.endDate) plan.period.endDate = new Date(period.endDate);
  }

  await plan.save();
  return plan;
}

export async function deleteWorkPlanService({ user, planId }) {
  const plan = await WorkPlan.findById(planId);
  if (!plan) throw notFound("Work plan not found.");
  if (["completed", "cancelled"].includes(plan.status)) {
    throw badRequest("Completed or cancelled work plans cannot be deleted.");
  }

  const planDateRaw = plan.date || plan.plan_date || plan.period?.startDate;
  if (isStructureWindowExpired(planDateRaw, { bypass: user.role === "super_admin" })) {
    throw badRequest("Work plans can only be deleted within 3 days after the work plan date.");
  }

  const ownerIdStr = String(plan.owner?._id || plan.owner);
  const createdByStr = String(plan.created_by?._id || plan.created_by);
  const userIdStr = String(user._id);

  const ok =
    ownerIdStr === userIdStr ||
    createdByStr === userIdStr ||
    (await canManageUser(user, ownerIdStr));
  if (!ok) throw forbidden("You are not authorized to delete this work plan.");

  await plan.softDelete();
}

export async function completeWorkPlanService({ user, planId }) {
  const plan = await WorkPlan.findById(planId);
  if (!plan) throw notFound("Work plan not found.");
  if (plan.status === "completed") throw badRequest("Work plan is already completed.");
  if (plan.status === "cancelled") throw badRequest("Cancelled work plans cannot be completed.");

  const ownerIdStr = String(plan.owner?._id || plan.owner);
  const createdByStr = String(plan.created_by?._id || plan.created_by);
  const userIdStr = String(user._id);

  const ok =
    ownerIdStr === userIdStr ||
    createdByStr === userIdStr ||
    (await canManageUser(user, ownerIdStr));
  if (!ok) throw forbidden("You are not authorized to mark this work plan as completed.");

  // Enforce all visits/tasks must be completed before marking plan completed
  if (plan.planType === "visits") {
    if (plan.visits && plan.visits.length > 0) {
      const pendingVisits = plan.visits.filter((v) => v.status !== "completed");
      if (pendingVisits.length > 0) {
        throw badRequest(`Cannot complete work plan: ${pendingVisits.length} site visit(s) are still pending.`);
      }
    } else {
      throw badRequest("Cannot complete work plan: No visits scheduled.");
    }
  } else if (["work_from_office", "work_from_home"].includes(plan.planType)) {
    if (plan.works && plan.works.length > 0) {
      const pendingWorks = plan.works.filter((w) => w.status !== "completed");
      if (pendingWorks.length > 0) {
        throw badRequest(`Cannot complete work plan: ${pendingWorks.length} work task(s) are still pending.`);
      }
    } else {
      throw badRequest("Cannot complete work plan: No work tasks listed.");
    }
  }

  plan.status = "completed";
  await plan.save();

  await logActivity({
    actor: user,
    action: "completed",
    entityType: "work_plan",
    entityId: plan._id,
    entityName: plan.title,
    message: `${user.name} marked work plan as completed.`,
  });

  return plan;
}

export async function cancelWorkPlanService({ user, planId }) {
  const plan = await WorkPlan.findById(planId);
  if (!plan) throw notFound("Work plan not found.");
  if (plan.status === "completed") throw badRequest("Completed work plans cannot be cancelled.");

  const planDateRaw = plan.date || plan.plan_date || plan.period?.startDate;
  if (isStructureWindowExpired(planDateRaw, { bypass: user.role === "super_admin" })) {
    throw badRequest("Work plans can only be cancelled within 3 days after the work plan date.");
  }

  const ownerIdStr = String(plan.owner?._id || plan.owner);
  const createdByStr = String(plan.created_by?._id || plan.created_by);
  const userIdStr = String(user._id);

  const ok =
    ownerIdStr === userIdStr ||
    createdByStr === userIdStr ||
    (await canManageUser(user, ownerIdStr));
  if (!ok) throw forbidden("You are not authorized to cancel this work plan.");

  plan.status = "cancelled";
  await plan.save();

  await logActivity({
    actor: user,
    action: "cancelled",
    entityType: "work_plan",
    entityId: plan._id,
    entityName: plan.title,
    message: `${user.name} cancelled work plan.`,
  });

  return plan;
}

// ---------------------------------------------------------------------------
// Work Tasks
// ---------------------------------------------------------------------------

export async function getWorkTasksService({ user, query }) {
  const { status, assignedTo, workPlanId, page = 1, limit = 50 } = query;

  const scope = getScopeForRole(user.role);
  const accessibleIds = await resolveUserIds(user, scope);

  const filter = { assignedTo: { $in: accessibleIds }, deleted_at: null };
  if (status) filter.status = status;
  if (workPlanId) filter.workPlanId = workPlanId;
  if (assignedTo && accessibleIds.some((id) => String(id) === String(assignedTo))) {
    filter.assignedTo = assignedTo;
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [tasks, total] = await Promise.all([
    WorkTask.find(filter)
      .populate("assignedTo", "name email role")
      .populate("assignedBy", "name email")
      .populate("facilityId", "name city")
      .populate("workPlanId", "title period status")
      .sort({ dueDate: 1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    WorkTask.countDocuments(filter),
  ]);

  return { tasks, total, page: Number(page), limit: Number(limit) };
}

export async function getWorkTaskService({ user, taskId }) {
  const task = await WorkTask.findById(taskId)
    .populate("assignedTo", "name email role")
    .populate("assignedBy", "name email")
    .populate("facilityId", "name city")
    .populate("workPlanId", "title period status")
    .lean();

  if (!task) throw notFound("Task not found.");

  const scope = getScopeForRole(user.role);
  const accessibleIds = (await resolveUserIds(user, scope)).map(String);
  if (!accessibleIds.includes(String(task.assignedTo?._id || task.assignedTo))) {
    throw forbidden("You are not authorized to view this task.");
  }

  return task;
}

export async function createWorkTaskService({ user, body }) {
  const { workPlanId, title, description, taskType, assignedTo, facilityId, priority, startDate, dueDate, estimatedMinutes } = body;

  if (!title) throw badRequest("Task title is required.");
  if (!assignedTo) throw badRequest("assignedTo is required.");

  // Can only assign to self or descendants
  if (String(assignedTo) !== String(user._id)) {
    const ok = await canManageUser(user, assignedTo);
    if (!ok) throw forbidden("You can only assign tasks to users within your hierarchy.");
  }

  const task = await WorkTask.create({
    workPlanId: workPlanId || null,
    title,
    description: description || "",
    taskType: taskType || "other",
    assignedTo,
    assignedBy: user._id,
    facilityId: facilityId || null,
    priority: priority || "medium",
    startDate: startDate ? new Date(startDate) : null,
    dueDate: dueDate ? new Date(dueDate) : null,
    estimatedMinutes: estimatedMinutes || null,
    status: String(assignedTo) === String(user._id) ? "draft" : "assigned",
  });

  await sendNotification({
    recipientId: assignedTo,
    senderId: user._id,
    title: "New Task Assigned",
    message: `${user.name} assigned you a task: ${title}`,
    referenceId: task._id,
  });

  await logActivity({
    actor: user,
    action: "assigned",
    entityType: "work_task",
    entityId: task._id,
    entityName: task.title,
    message: `${user.name} created and assigned task: ${title}`,
    meta: { assignedTo },
  });

  return task;
}

export async function updateWorkTaskService({ user, taskId, body }) {
  const task = await WorkTask.findById(taskId);
  if (!task) throw notFound("Task not found.");

  const scope = getScopeForRole(user.role);
  const accessibleIds = (await resolveUserIds(user, scope)).map(String);
  if (!accessibleIds.includes(String(task.assignedTo))) {
    throw forbidden("You are not authorized to update this task.");
  }

  const { title, description, priority, startDate, dueDate, estimatedMinutes, status } = body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (priority !== undefined) task.priority = priority;
  if (startDate !== undefined) task.startDate = new Date(startDate);
  if (dueDate !== undefined) task.dueDate = new Date(dueDate);
  if (estimatedMinutes !== undefined) task.estimatedMinutes = estimatedMinutes;
  if (status !== undefined) task.status = status;

  await task.save();
  return task;
}

export async function completeWorkTaskService({ user, taskId, remarks, actualMinutes }) {
  const task = await WorkTask.findById(taskId);
  if (!task) throw notFound("Task not found.");

  if (String(task.assignedTo) !== String(user._id)) {
    const ok = await canManageUser(user, task.assignedTo);
    if (!ok) throw forbidden("You are not authorized to complete this task.");
  }

  task.status = "completed";
  task.completion.completedAt = new Date();
  task.completion.completedBy = user._id;
  task.completion.remarks = remarks || "";
  task.completion.actualMinutes = actualMinutes || null;
  await task.save();

  await logActivity({
    actor: user,
    action: "completed",
    entityType: "work_task",
    entityId: task._id,
    entityName: task.title,
    message: `${user.name} completed task: ${task.title}`,
    meta: { remarks, actualMinutes },
  });

  return task;
}

export async function reassignWorkTaskService({ user, taskId, newAssigneeId }) {
  const task = await WorkTask.findById(taskId);
  if (!task) throw notFound("Task not found.");

  // Can only assign to users in hierarchy
  const ok = await canManageUser(user, task.assignedTo);
  if (!ok && String(task.assignedBy) !== String(user._id)) {
    throw forbidden("You are not authorized to reassign this task.");
  }

  if (String(newAssigneeId) !== String(user._id)) {
    const newOk = await canManageUser(user, newAssigneeId);
    if (!newOk) throw forbidden("You can only assign tasks to users within your hierarchy.");
  }

  const previousAssignee = task.assignedTo;
  task.assignedTo = newAssigneeId;
  task.assignedBy = user._id;
  task.status = "assigned";
  await task.save();

  await sendNotification({
    recipientId: newAssigneeId,
    senderId: user._id,
    title: "Task Reassigned to You",
    message: `${user.name} reassigned task "${task.title}" to you.`,
    referenceId: task._id,
  });

  await logActivity({
    actor: user,
    action: "assigned",
    entityType: "work_task",
    entityId: task._id,
    entityName: task.title,
    message: `${user.name} reassigned task "${task.title}".`,
    meta: { previousAssignee: String(previousAssignee), newAssignee: String(newAssigneeId) },
  });

  return task;
}

export async function getWorkPlannerDashboardService({ user }) {
  const scope = getScopeForRole(user.role);
  const accessibleIds = await resolveUserIds(user, scope);

  const [planStats, taskStats] = await Promise.all([
    WorkPlan.aggregate([
      { $match: { owner: { $in: accessibleIds }, deleted_at: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
    WorkTask.aggregate([
      { $match: { assignedTo: { $in: accessibleIds }, deleted_at: null } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);

  const planSummary = {};
  for (const { _id, count } of planStats) planSummary[_id] = count;

  const taskSummary = {};
  for (const { _id, count } of taskStats) taskSummary[_id] = count;

  return {
    plans: planSummary,
    tasks: taskSummary,
    totalPlans: Object.values(planSummary).reduce((a, b) => a + b, 0),
    totalTasks: Object.values(taskSummary).reduce((a, b) => a + b, 0),
  };
}
