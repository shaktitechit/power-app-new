import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  getExpensesService,
  getExpenseService,
  createExpenseService,
  updateExpenseService,
  deleteExpenseService,
  submitExpenseService,
  approveExpenseService,
  rejectExpenseService,
  reimburseExpenseService,
  getExpenseDashboardService,
  getExpenseReportsService,
  getExpensePoliciesService,
  createExpensePolicyService,
  updateExpensePolicyService,
} from "./expense-manager.services.js";

// Expenses
export const getExpenses = asyncHandler(async (req, res) => {
  res.json(await getExpensesService({ user: req.user, query: req.query }));
});

export const getExpense = asyncHandler(async (req, res) => {
  res.json(await getExpenseService({ user: req.user, expenseId: req.params.id }));
});

export const createExpense = asyncHandler(async (req, res) => {
  const expense = await createExpenseService({ user: req.user, body: req.body });
  res.status(201).json({ message: "Expense created.", expense });
});

export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await updateExpenseService({ user: req.user, expenseId: req.params.id, body: req.body });
  res.json({ message: "Expense updated.", expense });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  await deleteExpenseService({ user: req.user, expenseId: req.params.id });
  res.json({ message: "Expense deleted." });
});

export const submitExpense = asyncHandler(async (req, res) => {
  const expense = await submitExpenseService({ user: req.user, expenseId: req.params.id });
  res.json({ message: "Expense submitted for approval.", expense });
});

export const approveExpense = asyncHandler(async (req, res) => {
  const expense = await approveExpenseService({ user: req.user, expenseId: req.params.id, remarks: req.body.remarks });
  res.json({ message: "Expense approved.", expense });
});

export const rejectExpense = asyncHandler(async (req, res) => {
  const expense = await rejectExpenseService({ user: req.user, expenseId: req.params.id, reason: req.body.reason });
  res.json({ message: "Expense rejected.", expense });
});

export const reimburseExpense = asyncHandler(async (req, res) => {
  const expense = await reimburseExpenseService({ user: req.user, expenseId: req.params.id, reference: req.body.reference });
  res.json({ message: "Expense marked as reimbursed.", expense });
});

// Dashboard & Reports
export const getExpenseDashboard = asyncHandler(async (req, res) => {
  res.json(await getExpenseDashboardService({ user: req.user }));
});

export const getExpenseReports = asyncHandler(async (req, res) => {
  res.json(await getExpenseReportsService({ user: req.user, query: req.query }));
});

// Policies
export const getExpensePolicies = asyncHandler(async (req, res) => {
  res.json(await getExpensePoliciesService());
});

export const createExpensePolicy = asyncHandler(async (req, res) => {
  const policy = await createExpensePolicyService({ user: req.user, body: req.body });
  res.status(201).json({ message: "Expense policy created.", policy });
});

export const updateExpensePolicy = asyncHandler(async (req, res) => {
  const policy = await updateExpensePolicyService({ user: req.user, policyId: req.params.id, body: req.body });
  res.json({ message: "Expense policy updated.", policy });
});
