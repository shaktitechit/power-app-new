import express from "express";
import { protect } from "../../middlewares/authMiddleware.js";
import { uploadDocuments } from "../../middlewares/uploadMiddleware.js";
import { chatCompletion, textGeneration, chatWithFile, parseUtilityBill } from "./open-router.controllers.js";

const router = express.Router();

router.post("/chat", protect, chatCompletion);
router.post("/generate", protect, textGeneration);
router.post("/chat-with-file", protect, uploadDocuments, chatWithFile);
router.post("/parse-utility-bill", protect, uploadDocuments, parseUtilityBill);

export default router;
