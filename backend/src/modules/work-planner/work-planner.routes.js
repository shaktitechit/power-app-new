import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  getWorkPlans,
  getWorkPlan,
  createWorkPlan,
  updateWorkPlan,
  deleteWorkPlan,
  submitWorkPlan,
  approveWorkPlan,
  rejectWorkPlan,
  completeWorkPlan,
  cancelWorkPlan,
  getWorkTasks,
  getWorkTask,
  createWorkTask,
  updateWorkTask,
  completeWorkTask,
  reassignWorkTask,
  getWorkPlannerDashboard,
} from "./work-planner.controllers.js";

const router = express.Router();

router.use(protect);

// Work Plans
router.get("/dashboard", getWorkPlannerDashboard);
router.get("/", getWorkPlans);
router.post("/", createWorkPlan);
router.get("/:id", getWorkPlan);
router.put("/:id", updateWorkPlan);
router.delete("/:id", deleteWorkPlan);
router.post("/:id/submit", submitWorkPlan);
router.post("/:id/approve", approveWorkPlan);
router.post("/:id/reject", rejectWorkPlan);
router.post("/:id/complete", completeWorkPlan);
router.post("/:id/cancel", cancelWorkPlan);

export default router;
