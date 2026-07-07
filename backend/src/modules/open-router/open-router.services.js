import {
  OPENROUTER_API_KEY,
  OPENROUTER_MODEL,
  OPENROUTER_BASE_URL,
} from "../../config/openRouter.js";

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
    max_tokens: options.max_tokens,
    ...options.extraParams,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://power.spspl.com",
      "X-Title": "SPSPL Power Audit App",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter API error: [${response.status}] ${response.statusText} - ${errorText}`
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
