import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  getExpensePolicies,
  createExpensePolicy,
  updateExpensePolicy,
} from "./expense-manager.controllers.js";

const router = express.Router();

router.use(protect);

router.get("/", getExpensePolicies);
router.post("/", createExpensePolicy);
router.put("/:id", updateExpensePolicy);

export default router;
