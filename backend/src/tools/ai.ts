import { AIMessage } from "@langchain/core/messages";
import { AI_LIMITS, AI_MODELS, StageName } from "../config/ai";
import { createLlm } from "./langchain";
import { stripCodeFences } from "./sanitize";

/**
 * Generates code for one pipeline stage (html/css/js) via LangChain's
 * ChatOpenAI pointed at NVIDIA NIM.
 *
 * Changes from the OpenRouter/`openai.responses.create` version:
 * - `createLlm({ temperature, maxTokens })` builds a client configured for
 *   this stage's params (see tools/langchain.ts for why that's a factory
 *   call rather than a shared bound instance).
 * - Truncation is detected via `response.response_metadata.finish_reason`
 *   ("length" means the model hit maxTokens) instead of the Responses API's
 *   `status === "incomplete"` field, since NIM's Chat Completions responses
 *   use the standard OpenAI finish_reason enum.
 * - `response.content` is typed as `MessageContent`, which can be a string
 *   or a content-block array for multimodal responses. Every model used
 *   here is text-only, so a non-string content is treated as an error
 *   rather than silently stringified.
 */
export const generateCode = async (
  prompt: string,
  stage: Exclude<StageName, "architect">
): Promise<string> => {
  const { temperature, maxOutputTokens, timeoutMs } = AI_LIMITS[stage];

  const response = (await createLlm({
    model: AI_MODELS[stage],
    temperature,
    maxTokens: maxOutputTokens,
  }).invoke(prompt, { timeout: timeoutMs })) as AIMessage;

  if (response.response_metadata?.finish_reason === "length") {
    throw new Error(
      `${stage} generation was truncated before completing (hit maxTokens). ` +
        `Increase AI_LIMITS.${stage}.maxOutputTokens in src/config/ai.ts, ` +
        `or reduce prompt/architecture size.`
    );
  }

  if (typeof response.content !== "string") {
    throw new Error(
      `${stage} generation returned non-text content: ${JSON.stringify(
        response.content
      )}`
    );
  }

  const code = stripCodeFences(response.content);

  if (!code) {
    throw new Error(`${stage} generation returned empty output.`);
  }

  return code;
};
