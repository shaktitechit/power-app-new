import {
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
  OPENROUTER_BASE_URL,
} from "../../config/openRouter.js";

const UTILITY_BILL_SYSTEM_PROMPT = `You are an expert utility billing document parser.
Analyze the extracted text from an electricity bill document.
Your task is to extract the billing details and map them to the JSON schema below.
Extract every value that is present. Convert dates to YYYY-MM-DD format if they are present in other formats (e.g. DD/MM/YYYY or DD-MMM-YY).

Strictly extract:
- "billing_period_start": start date of the billing cycle (convert to YYYY-MM-DD)
- "billing_period_end": end date of the billing cycle (convert to YYYY-MM-DD)
- "bill_no": invoice or bill number
- "mdi_kVA": Maximum Demand indicator in kVA
- "units_kWh": Active energy consumption in kWh
- "units_kVAh": Apparent energy consumption in kVAh
- "fixed_charges_rs": Fixed or minimum monthly charges
- "demand_charges_rs": Demand charges
- "energy_charges_rs": Charges for the energy/units consumed
- "taxes_and_rent_rs": Duties, taxes, cess, and meter rent charges
- "other_charges_rs": Any other charges or adjustments not covered above
- "other_charges_remark": Description of other charges
- "penalty_rs": Penalties (e.g. low power factor penalty, late payment surcharge)
- "rebate_subsidy_rs": Rebates, subsidies, prompt payment discount, or power factor incentive

If any field is not found in the bill, set its value to null.
If the text does not contain any utility bill details at all, return an empty JSON object: {}

Response MUST be strictly valid JSON. Do not include any explanation, code blocks, or markdown formatting.`;

/**
 * Sends a chat completion request to OpenRouter.
 * @param {Array<{role: string, content: string}>} messages - The message history.
 * @param {Object} [options] - Optional parameters.
 * @param {string} [options.model] - Override default model.
 * @param {number} [options.temperature] - Sampling temperature.
 * @param {number} [options.max_tokens] - Maximum number of tokens to generate.
 * @param {Object} [options.extraParams] - Extra options to merge into the request body.
 * @returns {Promise<Object>} The API JSON response.
 */
export async function createChatCompletion(messages, options = {}) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key is not configured.");
  }

  const model = options.model || OPENROUTER_MODEL;
  const url = `${OPENROUTER_BASE_URL}/chat/completions`;

  const body = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 1500, // Safe default to prevent 402 errors on low credit balances
    ...options.extraParams,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://power.spspl.com",
      "X-Title": "SPSPL Power Audit App",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter API error: [${response.status}] ${response.statusText} - ${errorText}`,
    );
  }

  const data = await response.json();
  return data;
}

/**
 * Sends a single text prompt to OpenRouter and returns the content of the response.
 * @param {string} prompt - The user prompt.
 * @param {Object} [options] - Optional parameters.
 * @returns {Promise<string>} The generated text content.
 */
export async function generateText(prompt, options = {}) {
  const messages = [{ role: "user", content: prompt }];
  const response = await createChatCompletion(messages, options);

  if (response.choices && response.choices[0] && response.choices[0].message) {
    return response.choices[0].message.content;
  }

  throw new Error("Invalid response structure from OpenRouter API.");
}

/**
 * @param {Object} completion
 * @returns {Record<string, unknown>}
 */
export function parseJsonCompletion(completion) {
  const content = completion?.choices?.[0]?.message?.content;
  if (!content) {
    return {};
  }

  const cleanText = content.trim();

  // Try direct parsing first
  try {
    return JSON.parse(cleanText);
  } catch (e) {
    // If direct parse fails, check and strip markdown code blocks
    try {
      const match = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        return JSON.parse(match[1].trim());
      }
    } catch (innerError) {
      // ignore
    }
  }

  return {};
}

/**
 * Build OpenRouter messages for utility bill parsing from cleaned document text.
 * @param {string} documentContext
 * @param {string[]} [warnings]
 */
export function buildUtilityBillMessages(documentContext) {
  return [
    { role: "system", content: UTILITY_BILL_SYSTEM_PROMPT },
    {
      role: "user",
      content: `Extracted electricity bill text:\n${documentContext}\n\nParse the bill and return the JSON schema.`,
    },
  ];
}

/**
 * Run structured utility bill extraction on cleaned document text.
 * @param {string} documentContext
 * @param {string[]} [warnings]
 */
export async function parseUtilityBillFromText(documentContext, warnings = []) {
  const messages = buildUtilityBillMessages(documentContext);
  const completion = await createChatCompletion(messages, {
    temperature: 0.1,
    max_tokens: 1500,
    extraParams: {
      response_format: { type: "json_object" },
    },
  });

  return parseJsonCompletion(completion);
}

/**
 * Send chat completion using extracted document text instead of raw file payloads.
 * @param {Array<{ role: string, content: string }>} messages
 * @param {string} documentContext
 * @param {string[]} [warnings]
 * @param {Object} [options]
 */
export async function chatWithDocumentText(
  messages,
  documentContext,
  warnings = [],
  options = {},
) {
  const updatedMessages = [...messages];
  const lastMessage = { ...updatedMessages[updatedMessages.length - 1] };
  const userPrompt =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  const warningBlock =
    warnings.length > 0
      ? `Extraction warnings:\n- ${warnings.join("\n- ")}\n\n`
      : "";

  lastMessage.content = `${warningBlock}Extracted document text:\n${documentContext}\n\nUser request:\n${userPrompt}`;
  updatedMessages[updatedMessages.length - 1] = lastMessage;

  return createChatCompletion(updatedMessages, options);
}
