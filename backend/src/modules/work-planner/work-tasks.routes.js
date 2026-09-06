import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  getWorkTasks,
  getWorkTask,
  createWorkTask,
  updateWorkTask,
  completeWorkTask,
  reassignWorkTask,
} from "./work-planner.controllers.js";

const router = express.Router();

router.use(protect);

router.get("/", getWorkTasks);
router.post("/", createWorkTask);
router.get("/:id", getWorkTask);
router.put("/:id", updateWorkTask);
router.post("/:id/complete", completeWorkTask);
router.post("/:id/assign", reassignWorkTask);

export default router;
