/**
 * Expense Manager Service
 *
 * Manages the full expense lifecycle: create → submit → approve → reimburse.
 * - Users can only see/edit their own expenses (auditor)
 * - Managers can see/approve their direct reports' expenses
 * - Admins can see/approve all expenses in their hierarchy
 * - Super admins have full access
 *
 * Self-approval is NEVER allowed.
 * Approval level is determined by ExpensePolicy based on expense amount.
 */

import { modelsRegistry } from "../../data/modelRegistry.js";
const { Notification, RecentActivity, User, WorkPlan, Team } = modelsRegistry;
import Expense from "../../models/expense.js";
import ExpensePolicy from "../../models/expensePolicy.js";
import { canManageUser, getAncestors } from "../../services/hierarchy/hierarchyService.js";
import { getScopeForRole, resolveUserIds, SCOPES } from "../../services/hierarchy/scopeResolver.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function forbidden(msg = "Not authorized") { const e = new Error(msg); e.statusCode = 403; return e; }
function notFound(msg = "Not found") { const e = new Error(msg); e.statusCode = 404; return e; }
function badRequest(msg) { const e = new Error(msg); e.statusCode = 400; return e; }

async function log(actor, action, entityId, entityName, message, meta = {}) {
  try {
    await RecentActivity.create({
      actor_id: actor._id, actor_name: actor.name, actor_role: actor.role,
      action, entity_type: "expense", entity_id: entityId, entity_name: entityName,
      message, meta,
    });
  } catch { /* non-fatal */ }
}

async function notify(recipientId, senderId, title, message, referenceId) {
  try {
    await Notification.create({
      recipient: recipientId, sender: senderId, title, message,
      type: "expense", referenceId,
    });
  } catch { /* non-fatal */ }
}

/**
 * Validate 2-day window for expenses linked to a WorkPlan.
 * Expenses can only be logged/dated on the plan date or up to 2 days after (until 23:59:59 on day P+2).
 * Super admin can add or edit expenses anytime without restriction.
 */
async function validateWorkPlanExpenseWindow(workPlanId, expenseDateStr, user) {
  if (!workPlanId) return;
  if (user?.role === "super_admin") return;

  const workPlan = await WorkPlan.findById(workPlanId).lean();
  if (!workPlan) throw badRequest("Associated work plan not found.");

  const planDateRaw = workPlan.date || workPlan.period?.startDate;
  if (!planDateRaw) throw badRequest("Work plan date is invalid.");

  const planDate = new Date(planDateRaw);
  const minAllowedDate = new Date(planDate);
  minAllowedDate.setHours(0, 0, 0, 0);

  const maxAllowedDate = new Date(planDate);
  maxAllowedDate.setDate(maxAllowedDate.getDate() + 2);
  maxAllowedDate.setHours(23, 59, 59, 999);

  const now = new Date();
  if (now < minAllowedDate) {
    throw badRequest("Expenses cannot be logged before the work plan date.");
  }
  if (now > maxAllowedDate) {
    throw badRequest("The 2-day window for logging expenses for this work plan has expired.");
  }

  if (expenseDateStr) {
    const expDate = new Date(expenseDateStr);
    if (isNaN(expDate.getTime()) || expDate < minAllowedDate || expDate > maxAllowedDate) {
      throw badRequest("Expense date must fall on the work plan day or within 2 days after the plan date.");
    }
  }
}

/**
 * Check if a user is authorized to approve or reject an expense for an employee.
 * Strictly allowed for:
 * 1. Super Admin
 * 2. Team Leader of the employee (lead_id of static team)
 * 3. Direct reporting manager / ancestor in hierarchy (canManageUser)
 * Self-approval is NEVER allowed.
 */
async function canUserApproveExpense(user, employeeId) {
  if (!user || !employeeId) return false;
  if (String(user._id) === String(employeeId)) return false; // Self approval forbidden

  if (user.role === "super_admin") return true;

  const employee = await User.findById(employeeId).select("reportsTo team_id role").lean();
  if (!employee) return false;

  // Check static team lead
  if (employee.team_id) {
    const team = await Team.findById(employee.team_id).select("lead_id").lean();
    if (team && team.lead_id && String(team.lead_id) === String(user._id)) {
      return true;
    }
  }

  // Check hierarchy manager (reportsTo chain / direct reports manager)
  const isManagerInChain = await canManageUser(user, employeeId);
  if (isManagerInChain && ["super_admin", "admin", "manager"].includes(user.role)) {
    return true;
  }

  return false;
}

/**
 * Determine which role should approve this expense based on the active ExpensePolicy.
 * Default: manager ≤ 2000, admin ≤ 10000, super_admin > 10000
 */
async function determineApprovalLevel(amount) {
  const policy = await ExpensePolicy.findOne({ isDefault: true, isActive: true }).lean();

  if (!policy || !policy.rules?.length) {
    // Built-in default
    if (amount <= 2000) return { approverRole: "manager", approvalLevel: "manager" };
    if (amount <= 10000) return { approverRole: "admin", approvalLevel: "admin" };
    return { approverRole: "super_admin", approvalLevel: "super_admin" };
  }

  const sorted = [...policy.rules].sort((a, b) => (a.maxAmount ?? Infinity) - (b.maxAmount ?? Infinity));
  for (const rule of sorted) {
    if (rule.maxAmount === null || amount <= rule.maxAmount) {
      return { approverRole: rule.approverRole, approvalLevel: rule.approverRole || String(rule.approvalLevel) };
    }
  }
  const last = sorted[sorted.length - 1];
  return { approverRole: last.approverRole, approvalLevel: last.approverRole || String(last.approvalLevel) };
}

/**
 * Find the appropriate approver by walking up from the employee's reportsTo chain
 * until a user with the required role is found.
 */
async function findApproverInChain(employeeId, approverRole) {
  const ancestors = await getAncestors(employeeId);
  for (const ancestorId of ancestors) {
    const ancestor = await User.findById(ancestorId).select("role status").lean();
    if (ancestor && ancestor.role === approverRole && ancestor.status === "active") {
      return ancestorId;
    }
  }
  // Fallback: find any super_admin if no matching role found in chain
  if (approverRole !== "super_admin") {
    return findApproverInChain(employeeId, "super_admin");
  }
  return null;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function getExpensesService({ user, query }) {
  const { status, employeeId, category, tab, page = 1, limit = 50, startDate, endDate } = query;

  const scope = getScopeForRole(user.role);
  const accessibleIds = await resolveUserIds(user, scope);

  const filter = { employeeId: { $in: accessibleIds }, deleted_at: null };

  if (tab === "my" || employeeId === "my") {
    filter.employeeId = user._id;
  } else if (tab === "today") {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    filter.expenseDate = { $gte: todayStart, $lte: todayEnd };
  } else if (tab === "all") {
    filter.employeeId = { $in: accessibleIds };
  } else if (tab === "team" || employeeId === "team") {
    filter.employeeId = {
      $in: accessibleIds.filter((id) => String(id) !== String(user._id)),
    };
  } else if (tab === "approvals") {
    filter.status = { $in: ["submitted", "under_review"] };
    filter.employeeId = {
      $in: accessibleIds.filter((id) => String(id) !== String(user._id)),
    };
  } else if (employeeId && accessibleIds.some((id) => String(id) === String(employeeId))) {
    filter.employeeId = employeeId;
  }

  if (status && status !== "all" && tab !== "approvals") {
    filter.status = status;
  }
  if (category && category !== "all") {
    filter.category = category;
  }
  if (startDate || endDate) {
    filter.expenseDate = {};
    if (startDate) filter.expenseDate.$gte = new Date(startDate);
    if (endDate) filter.expenseDate.$lte = new Date(endDate);
  }

  const parsedLimit = Math.min(Number(limit) || 50, 1000);
  const skip = (Number(page) - 1) * parsedLimit;
  const [expenses, total] = await Promise.all([
    Expense.find(filter)
      .populate("employeeId", "name email role")
      .populate("workPlanId", "title period date")
      .populate("taskId", "title")
      .populate("facilityId", "name city")
      .populate("approval.requiredFrom", "name email role")
      .populate("approval.approvedBy", "name email role")
      .populate("approval.rejectedBy", "name email role")
      .sort({ expenseDate: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
    Expense.countDocuments(filter),
  ]);

  return { expenses, total, page: Number(page), limit: parsedLimit };
}

export async function getExpenseService({ user, expenseId }) {
  const expense = await Expense.findById(expenseId)
    .populate("employeeId", "name email role")
    .populate("workPlanId", "title date")
    .populate("taskId", "title")
    .populate("facilityId", "name city")
    .populate("approval.requiredFrom", "name email role")
    .populate("approval.approvedBy", "name email role")
    .populate("approval.rejectedBy", "name email role")
    .lean();

  if (!expense) throw notFound("Expense not found.");

  const scope = getScopeForRole(user.role);
  const accessibleIds = (await resolveUserIds(user, scope)).map(String);
  if (!accessibleIds.includes(String(expense.employeeId?._id || expense.employeeId))) {
    throw forbidden("You are not authorized to view this expense.");
  }

  return expense;
}

export async function createExpenseService({ user, body }) {
  const {
    employeeId,
    workPlanId, taskId, visitId, facilityId,
    expenseDate, category, subcategory,
    amount, description, receiptUrl, receiptFileId,
  } = body;

  if (!category) throw badRequest("Category is required.");
  if (!amount || amount <= 0) throw badRequest("Amount must be greater than 0.");
  if (!description) throw badRequest("Description is required.");
  if (!expenseDate) throw badRequest("Expense date is required.");

  if (Number(amount) > 500 && !receiptUrl && !receiptFileId) {
    throw badRequest("Receipt document (Image or PDF) is required for expenses greater than ₹500.");
  }

  // Employee: either current user or a descendant
  const targetEmployee = employeeId || String(user._id);
  if (String(targetEmployee) !== String(user._id)) {
    const ok = await canManageUser(user, targetEmployee);
    if (!ok) throw forbidden("You are not authorized to create expenses for this employee.");
  }

  // Enforce 2-day work plan date window check if linked to a work plan (bypassed for super_admin)
  if (workPlanId) {
    await validateWorkPlanExpenseWindow(workPlanId, expenseDate, user);
  }

  const { approverRole, approvalLevel } = await determineApprovalLevel(amount);
  const approverId = await findApproverInChain(targetEmployee, approverRole);

  const expense = await Expense.create({
    employeeId: targetEmployee,
    workPlanId: workPlanId || null,
    taskId: taskId || null,
    visitId: visitId || null,
    facilityId: facilityId || null,
    expenseDate: new Date(expenseDate),
    category,
    subcategory: subcategory || null,
    amount,
    description,
    receiptUrl: receiptUrl || null,
    receiptFileId: receiptFileId || null,
    status: "draft",
    approval: {
      requiredFrom: approverId,
      approvalLevel,
    },
  });

  await log(user, "created", expense._id, `Expense: ${category}`, `${user.name} created an expense of ₹${amount}.`);

  return expense;
}

export async function updateExpenseService({ user, expenseId, body }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw notFound("Expense not found.");
  if (!["draft", "rejected"].includes(expense.status)) {
    throw badRequest("Only draft or rejected expenses can be edited.");
  }

  const ok =
    String(expense.employeeId) === String(user._id) ||
    (await canManageUser(user, expense.employeeId));
  if (!ok) throw forbidden("You are not authorized to update this expense.");

  const { expenseDate, category, subcategory, amount, description, receiptUrl, facilityId, workPlanId, taskId } = body;

  const targetWorkPlanId = workPlanId !== undefined ? workPlanId : expense.workPlanId;
  const targetExpenseDate = expenseDate !== undefined ? expenseDate : expense.expenseDate;
  if (targetWorkPlanId) {
    await validateWorkPlanExpenseWindow(targetWorkPlanId, targetExpenseDate, user);
  }

  if (expenseDate !== undefined) expense.expenseDate = new Date(expenseDate);
  if (category !== undefined) expense.category = category;
  if (subcategory !== undefined) expense.subcategory = subcategory;
  if (description !== undefined) expense.description = description;
  if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl;
  if (facilityId !== undefined) expense.facilityId = facilityId;
  if (workPlanId !== undefined) expense.workPlanId = workPlanId;
  if (taskId !== undefined) expense.taskId = taskId;

  // Recalculate approval if amount changed
  if (amount !== undefined && amount !== expense.amount) {
    expense.amount = amount;
    const { approverRole, approvalLevel } = await determineApprovalLevel(amount);
    const approverId = await findApproverInChain(expense.employeeId, approverRole);
    expense.approval.requiredFrom = approverId;
    expense.approval.approvalLevel = approvalLevel;
  }

  await expense.save();
  return expense;
}

export async function deleteExpenseService({ user, expenseId }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw notFound("Expense not found.");
  if (expense.status !== "draft") throw badRequest("Only draft expenses can be deleted.");
  if (String(expense.employeeId) !== String(user._id)) {
    const ok = await canManageUser(user, expense.employeeId);
    if (!ok) throw forbidden("You are not authorized to delete this expense.");
  }
  await expense.softDelete();
}

export async function submitExpenseService({ user, expenseId }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw notFound("Expense not found.");
  if (!["draft", "rejected"].includes(expense.status)) {
    throw badRequest("Only draft or rejected expenses can be submitted.");
  }

  if (String(expense.employeeId) !== String(user._id)) {
    throw forbidden("You can only submit your own expenses.");
  }

  expense.status = "submitted";
  await expense.save();

  if (expense.approval?.requiredFrom) {
    await notify(
      expense.approval.requiredFrom,
      user._id,
      "Expense Submitted for Approval",
      `${user.name} submitted an expense of ₹${expense.amount} (${expense.category}) for your approval.`,
      expense._id,
    );
  }

  await log(user, "submitted", expense._id, `Expense: ${expense.category}`, `${user.name} submitted expense for approval.`);
  return expense;
}

export async function approveExpenseService({ user, expenseId, remarks }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw notFound("Expense not found.");
  if (!["submitted", "under_review"].includes(expense.status)) {
    throw badRequest("Only submitted expenses can be approved.");
  }

  // Cannot approve own expense
  if (String(expense.employeeId) === String(user._id)) {
    throw forbidden("You cannot approve your own expense.");
  }

  // Strictly check Team Leader or Super Admin approval authorization
  const isAuthorized = await canUserApproveExpense(user, expense.employeeId);
  if (!isAuthorized) {
    throw forbidden("Only the Team Leader or Super Admin can approve this expense.");
  }

  expense.status = "approved";
  expense.approval.approvedBy = user._id;
  expense.approval.approvedAt = new Date();
  await expense.save();

  await notify(
    expense.employeeId,
    user._id,
    "Expense Approved",
    `Your expense of ₹${expense.amount} (${expense.category}) was approved by ${user.name}.`,
    expense._id,
  );

  await log(user, "approved", expense._id, `Expense: ${expense.category}`, `${user.name} approved expense of ₹${expense.amount}.`, { remarks });
  return expense;
}

export async function rejectExpenseService({ user, expenseId, reason }) {
  const expense = await Expense.findById(expenseId);
  if (!expense) throw notFound("Expense not found.");
  if (!["submitted", "under_review"].includes(expense.status)) {
    throw badRequest("Only submitted expenses can be rejected.");
  }

  if (String(expense.employeeId) === String(user._id)) {
    throw forbidden("You cannot reject your own expense.");
  }

  // Strictly check Team Leader or Super Admin authorization
  const isAuthorized = await canUserApproveExpense(user, expense.employeeId);
  if (!isAuthorized) {
    throw forbidden("Only the Team Leader or Super Admin can reject this expense.");
  }

  expense.status = "rejected";
  expense.approval.rejectedBy = user._id;
  expense.approval.rejectedAt = new Date();
  expense.approval.rejectionReason = reason || "";
  await expense.save();

  await notify(
    expense.employeeId,
    user._id,
    "Expense Rejected",
    `Your expense of ₹${expense.amount} was rejected. Reason: ${reason || "No reason provided."}`,
    expense._id,
  );

  await log(user, "rejected", expense._id, `Expense: ${expense.category}`, `${user.name} rejected expense.`, { reason });
  return expense;
}

export async function reimburseExpenseService({ user, expenseId, reference }) {
  if (!["super_admin", "admin"].includes(user.role)) {
    throw forbidden("Only admins can mark expenses as reimbursed.");
  }

  const expense = await Expense.findById(expenseId);
  if (!expense) throw notFound("Expense not found.");
  if (expense.status !== "approved") throw badRequest("Only approved expenses can be reimbursed.");

  expense.status = "reimbursed";
  expense.reimbursement.status = "completed";
  expense.reimbursement.processedAt = new Date();
  expense.reimbursement.processedBy = user._id;
  expense.reimbursement.reference = reference || "";
  await expense.save();

  await notify(
    expense.employeeId,
    user._id,
    "Expense Reimbursed",
    `Your expense of ₹${expense.amount} has been reimbursed. Reference: ${reference || "N/A"}`,
    expense._id,
  );

  await log(user, "reimbursed", expense._id, `Expense: ${expense.category}`, `${user.name} marked expense as reimbursed.`, { reference });
  return expense;
}

// ---------------------------------------------------------------------------
// Dashboard & Reports
// ---------------------------------------------------------------------------

export async function getExpenseDashboardService({ user }) {
  const scope = getScopeForRole(user.role);
  const accessibleIds = await resolveUserIds(user, scope);

  const [statusStats, amountStats] = await Promise.all([
    Expense.aggregate([
      { $match: { employeeId: { $in: accessibleIds }, deleted_at: null } },
      { $group: { _id: "$status", count: { $sum: 1 }, totalAmount: { $sum: "$amount" } } },
    ]),
    Expense.aggregate([
      { $match: { employeeId: { $in: accessibleIds }, deleted_at: null } },
      { $group: { _id: null, totalAmount: { $sum: "$amount" } } },
    ]),
  ]);

  const summary = {};
  for (const { _id, count, totalAmount } of statusStats) {
    summary[_id] = { count, totalAmount };
  }

  return {
    summary,
    totalAmount: amountStats[0]?.totalAmount || 0,
    totalExpenses: statusStats.reduce((a, b) => a + b.count, 0),
  };
}

export async function getExpenseReportsService({ user, query }) {
  const { groupBy = "category", startDate, endDate } = query;

  const scope = getScopeForRole(user.role);
  const accessibleIds = await resolveUserIds(user, scope);

  const match = { employeeId: { $in: accessibleIds }, deleted_at: null };
  if (startDate || endDate) {
    match.expenseDate = {};
    if (startDate) match.expenseDate.$gte = new Date(startDate);
    if (endDate) match.expenseDate.$lte = new Date(endDate);
  }

  const groupField = `$${groupBy}`;
  const results = await Expense.aggregate([
    { $match: match },
    {
      $group: {
        _id: groupField,
        count: { $sum: 1 },
        totalAmount: { $sum: "$amount" },
        approvedAmount: {
          $sum: { $cond: [{ $in: ["$status", ["approved", "reimbursed"]] }, "$amount", 0] },
        },
        pendingAmount: {
          $sum: { $cond: [{ $eq: ["$status", "submitted"] }, "$amount", 0] },
        },
      },
    },
    { $sort: { totalAmount: -1 } },
  ]);

  return results;
}

// ---------------------------------------------------------------------------
// Expense Policy
// ---------------------------------------------------------------------------

export async function getExpensePoliciesService() {
  return ExpensePolicy.find({ isActive: true }).sort({ created_at: -1 }).lean();
}

export async function createExpensePolicyService({ user, body }) {
  if (user.role !== "super_admin") {
    throw forbidden("Only super admin can create expense policies.");
  }

  const { name, description, rules, isDefault } = body;
  if (!name) throw badRequest("Policy name is required.");
  if (!rules?.length) throw badRequest("At least one rule is required.");

  if (isDefault) {
    await ExpensePolicy.updateMany({}, { isDefault: false });
  }

  return ExpensePolicy.create({ name, description: description || "", rules, isDefault: !!isDefault });
}

export async function updateExpensePolicyService({ user, policyId, body }) {
  if (user.role !== "super_admin") {
    throw forbidden("Only super admin can update expense policies.");
  }

  const policy = await ExpensePolicy.findById(policyId);
  if (!policy) throw notFound("Policy not found.");

  const { name, description, rules, isDefault, isActive } = body;
  if (name !== undefined) policy.name = name;
  if (description !== undefined) policy.description = description;
  if (rules !== undefined) policy.rules = rules;
  if (isActive !== undefined) policy.isActive = isActive;

  if (isDefault) {
    await ExpensePolicy.updateMany({ _id: { $ne: policyId } }, { isDefault: false });
    policy.isDefault = true;
  }

  await policy.save();
  return policy;
}
