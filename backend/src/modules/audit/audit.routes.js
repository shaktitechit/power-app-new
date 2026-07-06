import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import {
  getElectricalEnergyAudit,
  getElectricalSafetyAudit,
  getFacilityAuditSnapshot,
} from "./audit.controllers.js";

const router = express.Router();

router.get("/electrical-energy", protect, getElectricalEnergyAudit);
router.get("/electrical-safety", protect, getElectricalSafetyAudit);
router.get("/facility-snapshot", protect, getFacilityAuditSnapshot);

export default router;
