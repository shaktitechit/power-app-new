import express from "express";
import { newLeads } from "./email.controllers.js";

const router = express.Router();
router.post("/leads", newLeads);

export default router;
