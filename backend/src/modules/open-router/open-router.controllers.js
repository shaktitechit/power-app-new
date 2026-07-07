import asyncHandler from "../../middlewares/asyncHandler.js";
import {
  chatWithDocumentText,
  createChatCompletion,
  generateText,
  parseUtilityBillFromText,
} from "./open-router.services.js";
import { buildDocumentTextContext } from "./document/documentTextPipeline.js";

function parseJsonField(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

// @route POST /api/v1/open-router/chat
// @desc Create a chat completion with OpenRouter
// @access Private
export const chatCompletion = asyncHandler(async (req, res) => {
  const { messages, options } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ message: "messages array is required" });
  }

  const result = await createChatCompletion(messages, options);
  res.json(result);
});

// @route POST /api/v1/open-router/generate
// @desc Generate text from a single prompt with OpenRouter
// @access Private
export const textGeneration = asyncHandler(async (req, res) => {
  const { prompt, options } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ message: "prompt string is required" });
  }

  const result = await generateText(prompt, options);
  res.json({ content: result });
});

// @route POST /api/v1/open-router/chat-with-file
// @desc Upload image/PDF → pdfjs/Tesseract extraction → OpenRouter
// @access Private
export const chatWithFile = asyncHandler(async (req, res) => {
  const messages = parseJsonField(req.body.messages, null);
  const options = parseJsonField(req.body.options, {});

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ message: "messages array is required and cannot be empty" });
  }

  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ message: "At least one document is required." });
  }

  const { context, warnings } = await buildDocumentTextContext(files);
  const result = await chatWithDocumentText(messages, context, warnings, options);

  res.json({
    ...result,
    documentProcessing: {
      fileCount: files.length,
      warnings,
    },
  });
});

// @route POST /api/v1/open-router/parse-utility-bill
// @desc Upload utility bill → pdfjs/Tesseract → structured JSON via OpenRouter
// @access Private
export const parseUtilityBill = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ message: "No bill document uploaded." });
  }

  const { context, warnings, hasReadableText } = await buildDocumentTextContext(files);

  if (!hasReadableText) {
    const detail =
      warnings.length > 0 ? ` Details: ${warnings.join(" | ")}` : "";
    return res.status(400).json({
      message: `Could not extract readable text from the bill.${detail}`,
      warnings,
    });
  }

  const parsedData = await parseUtilityBillFromText(context, warnings);

  if (warnings.length > 0) {
    res.set("X-Document-Warnings", warnings.join(" | "));
  }

  res.json(parsedData);
});
