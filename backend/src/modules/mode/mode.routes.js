import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { setMode, getMode, clearMode } from "./mode.controllers.js";

const router = express.Router();

router.get("/", protect, getMode);
router.post("/set", protect, setMode);
router.delete("/", protect, clearMode);

export default router;
