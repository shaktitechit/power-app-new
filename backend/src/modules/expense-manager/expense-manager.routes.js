import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  submitExpense,
  approveExpense,
  rejectExpense,
  reimburseExpense,
  getExpenseDashboard,
  getExpenseReports,
} from "./expense-manager.controllers.js";

const router = express.Router();

router.use(protect);

// Must come before /:id routes
router.get("/dashboard", getExpenseDashboard);
router.get("/reports", getExpenseReports);

router.get("/", getExpenses);
router.post("/", createExpense);
router.get("/:id", getExpense);
router.put("/:id", updateExpense);
router.delete("/:id", deleteExpense);
router.post("/:id/submit", submitExpense);
router.post("/:id/approve", approveExpense);
router.post("/:id/reject", rejectExpense);
router.post("/:id/reimburse", reimburseExpense);

export default router;
