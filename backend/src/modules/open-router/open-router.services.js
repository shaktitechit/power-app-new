import {
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
  OPENROUTER_BASE_URL,
} from "../../config/openRouter.js";

const UTILITY_BILL_SYSTEM_PROMPT = `
You are an expert Indian electricity utility bill parser.

The input is OCR or extracted text from an electricity bill. Bills may belong to ANY electricity distribution company across India and may have different layouts, languages, abbreviations and terminology.

Your goal is to normalize the bill into the JSON schema below.

IMPORTANT RULES

1. Search the ENTIRE document before deciding a field is missing.

2. Different utilities use different names for the same information.
Always map synonymous labels.

Examples:

Billing Period
- Billing Period
- Bill Month
- Bill Date Range
- Consumption Period
- Meter Reading Period
- Reading From / Reading To
- Previous Reading Date / Current Reading Date

Bill Number
- Bill No
- Bill Number
- Invoice Number
- Consumer Bill Number
- Document Number

Maximum Demand
- MDI
- Maximum Demand
- Recorded Demand
- Max Demand
- Billing Demand
- Billed Demand
- Contract Demand Used
- kVA Demand

Energy Consumption (kWh)
- Units
- Energy
- Active Energy
- Consumption
- Import kWh
- kWh Consumed

Apparent Energy (kVAh)
- kVAh
- Apparent Energy
- Import kVAh
- Total kVAh

Fixed Charges
May appear as
- Fixed Charges
- Fixed Cost
- Monthly Charges
- Minimum Charges
- Customer Charges
- Meter Charges
- Service Charges
- Demand Fixed Charges

Demand Charges
May appear as
- Demand Charges
- Maximum Demand Charges
- Contract Demand Charges
- Billing Demand Charges
- MD Charges

Energy Charges
May appear as
- Energy Charges
- Energy Cost
- Unit Charges
- Consumption Charges
- Consumption Cost
- Variable Charges

Taxes
Combine ALL of these into taxes_and_rent_rs

Examples:
- Electricity Duty
- ED
- Duty
- Tax
- GST
- Meter Rent
- Meter Charges
- Cess
- Government Duty

Penalty
Examples

- PF Penalty
- Low PF Penalty
- Late Payment Surcharge
- Delayed Payment Charges
- Penal Charges
- Power Factor Penalty

Rebate / Subsidy

Examples

- Prompt Payment Rebate
- Prompt Payment Discount
- PF Incentive
- Subsidy
- Solar Subsidy
- Government Subsidy
- Rebate

Other Charges

Everything that does not belong to any category above should be summed into

other_charges_rs

Examples

- FAC
- FCA
- FPPPA
- Fuel Surcharge
- Regulatory Charges
- Regulatory Surcharge
- TOD Charges
- Wheeling Charges
- Banking Charges
- Open Access Charges
- Green Energy Charges
- Arrears
- Adjustment
- Previous Balance
- Misc Charges
- Additional Charges
- Delayed Adjustment

For every amount added to other_charges_rs, include its label in other_charges_remark separated by commas.

------------------------------------------------

OUTPUT RULES

Return ONLY valid JSON.

Numbers:
- Remove commas.
- Remove ₹.
- Remove Rs.
- Remove spaces.
- Return numeric values only.

Dates:
Convert every detected date into YYYY-MM-DD.

Do NOT calculate missing values.

Do NOT guess.

If multiple values exist, choose the value belonging to the CURRENT BILL.

Ignore:
- Previous bills
- Payment history
- Graphs
- Advertisements
- QR codes
- Consumer information
- Tariff tables unless they contain billing values.

If a value is missing return null.

If this is not an electricity bill return {}.

Return exactly this schema:

{
  "billing_period_start": null,
  "billing_period_end": null,
  "bill_no": null,
  "mdi_kVA": null,
  "units_kWh": null,
  "units_kVAh": null,
  "fixed_charges_rs": null,
  "demand_charges_rs": null,
  "energy_charges_rs": null,
  "taxes_and_rent_rs": null,
  "other_charges_rs": null,
  "other_charges_remark": null,
  "penalty_rs": null,
  "rebate_subsidy_rs": null
}
`;

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
