import { ChatOpenAI } from "@langchain/openai";
import "dotenv/config";

const BASE_URL = process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1"
const AI_API_KEY = process.env.OPENROUTER_API_KEY ?? "";

export interface StageLlmParams {
  model: string;
  temperature: number;
  maxTokens: number;
  timeoutMs?: number;
}

export function createLlm({ model, temperature, maxTokens }: StageLlmParams) {
  console.log("=== CREATE LLM ===");
  console.log("Model:", model);
  console.log("Temperature:", temperature);
  console.log("Max tokens:", maxTokens);
  console.log("BASE_URL:", BASE_URL);
  console.log("AI_API_KEY set:", !!AI_API_KEY.length);

  const llm = new ChatOpenAI({
    model,
    temperature,
    maxTokens,
    configuration: {
      baseURL: BASE_URL,
      apiKey: AI_API_KEY,
    },
  });

  console.log("LLM created successfully");
  return llm;
}
