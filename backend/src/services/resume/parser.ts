import { ChatPromptTemplate } from "@langchain/core/prompts";

import { ResumeSchema } from "./schema";
import { resumeParserPrompt } from "./prompt";

import { createLlm } from "../../tools/langchain";
import { AI_MODELS, AI_LIMITS } from "../../config/ai";

export async function parseResume(text: string) {
  console.log("=== START parseResume ===");
  console.log("Input text length:", text.length);

  const { temperature, maxOutputTokens, timeoutMs } = AI_LIMITS.resume;
  console.log("AI_LIMITS.resume:", { temperature, maxOutputTokens, timeoutMs });
  console.log("AI_MODELS.resume:", AI_MODELS.resume);

  console.log("Creating LLM with model:", AI_MODELS.resume);
  const llm = createLlm({
    model: AI_MODELS.resume,
    temperature,
    maxTokens: maxOutputTokens,
  });

  console.log("Creating structured LLM");
  const structuredLlm = llm.withStructuredOutput(ResumeSchema);

  console.log("Creating prompt chain");
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", resumeParserPrompt],
    ["human", "{resume}"],
  ]);

  const chain = prompt.pipe(structuredLlm);

  console.log("Invoking chain with timeoutMs:", timeoutMs);
  const startTime = Date.now();
  try {
    const result = await chain.invoke(
      { resume: text },
      { timeout: timeoutMs }
    );
    const endTime = Date.now();
    console.log("=== END parseResume (SUCCESS) ===", {
      durationMs: endTime - startTime,
      resultKeys: Object.keys(result)
    });
    return result;
  } catch (error) {
    const endTime = Date.now();
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("===== PARSE RESUME ERROR =====", {
      error: errorMessage,
      durationMs: endTime - startTime
    });
    console.error("Error stack:", errorStack);
    throw error;
  }
}
