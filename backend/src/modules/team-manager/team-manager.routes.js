import express from "express";
import { protect, super_admin } from "../../middlewares/authMiddleware.js";
import {
  getHierarchy,
  getTeamUsers,
  getTeamUserDetail,
  assignUser,
  moveUser,
  createTeam,
  updateTeam,
  deleteTeam,
  activateUser,
  deactivateUser,
  getTeamReport,
} from "./team-manager.controllers.js";

const router = express.Router();

// All routes require authentication and super_admin privilege
router.use(protect, super_admin);

// Organization hierarchy tree
router.get("/hierarchy", getHierarchy);

// Team users (with role/manager/search filters)
router.get("/users", getTeamUsers);
router.get("/users/:id", getTeamUserDetail);

// Team creation, assignment and movement
router.post("/create", createTeam);
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);
router.put("/users/:id/assign", assignUser);
router.put("/users/:id/move", moveUser);

// Status management
router.put("/users/:id/activate", activateUser);
router.put("/users/:id/deactivate", deactivateUser);

// Reports
router.get("/reports", getTeamReport);

export default router;
