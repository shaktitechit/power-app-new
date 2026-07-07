import asyncHandler from "../../middlewares/asyncHandler.js";
import { createChatCompletion, generateText } from "./open-router.services.js";
import pdfParse from "pdf-parse";

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
// @desc Upload image or PDF and send prompt/messages to OpenRouter
// @access Private
export const chatWithFile = asyncHandler(async (req, res) => {
  let messages;
  try {
    messages = typeof req.body.messages === "string"
      ? JSON.parse(req.body.messages)
      : req.body.messages;
  } catch (e) {
    return res.status(400).json({ message: "Invalid JSON format for messages" });
  }

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ message: "messages array is required and cannot be empty" });
  }

  let options = {};
  if (req.body.options) {
    try {
      options = typeof req.body.options === "string"
        ? JSON.parse(req.body.options)
        : req.body.options;
    } catch (e) {
      // ignore
    }
  }

  const files = req.files || [];
  const imageParts = [];
  const pdfTexts = [];

  for (const file of files) {
    if (file.mimetype.startsWith("image/")) {
      const base64 = file.buffer.toString("base64");
      imageParts.push({
        type: "image_url",
        image_url: {
          url: `data:${file.mimetype};base64,${base64}`,
        },
      });
    } else if (file.mimetype === "application/pdf") {
      try {
        const parsed = await pdfParse(file.buffer);
        if (parsed && parsed.text) {
          pdfTexts.push(
            `--- START OF FILE: ${file.originalname} ---\n${parsed.text.trim()}\n--- END OF FILE: ${file.originalname} ---`
          );
        }
      } catch (err) {
        console.error(`Error parsing PDF ${file.originalname}:`, err);
        pdfTexts.push(`[Failed to parse PDF document: ${file.originalname}]`);
      }
    }
  }

  // Create updated messages list
  const updatedMessages = [...messages];
  const lastMessage = { ...updatedMessages[updatedMessages.length - 1] };

  let textContent = lastMessage.content;
  if (pdfTexts.length > 0) {
    textContent = `Attached Documents context:\n${pdfTexts.join("\n\n")}\n\nUser Prompt: ${textContent}`;
  }

  if (imageParts.length > 0) {
    lastMessage.content = [
      { type: "text", text: textContent },
      ...imageParts,
    ];
  } else {
    lastMessage.content = textContent;
  }

  updatedMessages[updatedMessages.length - 1] = lastMessage;

  const result = await createChatCompletion(updatedMessages, options);
  res.json(result);
});

// @route POST /api/v1/open-router/parse-utility-bill
// @desc Upload utility bill (image/PDF) and extract structured JSON data matching billing form fields
// @access Private
export const parseUtilityBill = asyncHandler(async (req, res) => {
  const files = req.files || [];
  if (files.length === 0) {
    return res.status(400).json({ message: "No bill document uploaded." });
  }

  const file = files[0];
  let imageContent = null;
  let pdfTextContent = "";

  if (file.mimetype.startsWith("image/")) {
    const base64 = file.buffer.toString("base64");
    imageContent = `data:${file.mimetype};base64,${base64}`;
  } else if (file.mimetype === "application/pdf") {
    try {
      const parsed = await pdfParse(file.buffer);
      if (parsed && parsed.text) {
        pdfTextContent = parsed.text.trim();
      }
    } catch (err) {
      console.error(`Error parsing PDF in billing extractor:`, err);
      return res.status(400).json({ message: "Failed to parse PDF document." });
    }
  } else {
    return res.status(400).json({ message: "Only images and PDFs are allowed." });
  }

  const systemPrompt = `You are an expert utility billing document parser.
Analyze the provided electricity bill (either as an image or text parsed from a PDF).
Extract the following fields and return ONLY a valid JSON object matching the schema below.
If any field is not found in the bill, set its value to null.
Do NOT make assumptions, guess, or extrapolate. Only extract clear, explicit values printed on the bill.
If the document is not an electricity bill, or is invalid/illegible, return an empty JSON object: {}

JSON Schema:
{
  "billing_period_start": "YYYY-MM-DD or null",
  "billing_period_end": "YYYY-MM-DD or null",
  "bill_no": "string or null",
  "mdi_kVA": number or null,
  "units_kWh": number or null,
  "units_kVAh": number or null,
  "fixed_charges_rs": number or null,
  "demand_charges_rs": number or null,
  "energy_charges_rs": number or null,
  "taxes_and_rent_rs": number or null,
  "other_charges_rs": number or null,
  "other_charges_remark": "string or null",
  "penalty_rs": number or null,
  "rebate_subsidy_rs": number or null
}

Response MUST be strictly valid JSON. Do not include any explanation, code blocks, or markdown formatting.`;

  let userContent = "";
  if (pdfTextContent) {
    userContent = `Please parse the following text content from the electricity bill PDF:\n\n${pdfTextContent}`;
  } else {
    userContent = "Please parse the attached electricity bill image.";
  }

  const messages = [
    { role: "system", content: systemPrompt },
  ];

  if (imageContent) {
    messages.push({
      role: "user",
      content: [
        { type: "text", text: userContent },
        { type: "image_url", image_url: { url: imageContent } }
      ]
    });
  } else {
    messages.push({
      role: "user",
      content: userContent
    });
  }

  const result = await createChatCompletion(messages, {
    temperature: 0.1,
    extraParams: {
      response_format: { type: "json_object" }
    }
  });

  let parsedData = {};
  if (result.choices && result.choices[0] && result.choices[0].message) {
    try {
      const content = result.choices[0].message.content.trim();
      parsedData = JSON.parse(content);
    } catch (parseError) {
      console.error("Error parsing AI JSON output:", parseError);
    }
  }

  res.json(parsedData);
});

