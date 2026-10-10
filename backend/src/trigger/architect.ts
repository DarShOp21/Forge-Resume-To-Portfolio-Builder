import { logger, task } from "@trigger.dev/sdk";
import { aiQueue } from "./queue";
import { createLlm } from "../tools/langchain";
import { AI_LIMITS, AI_MODELS, AI_RETRY_ARCHITECT } from "../config/ai";
import { architectPrompt } from "../prompts/architect";
import { architectureSchema } from "../schemas/architecture";
import { Architecture } from "../types/architecture";

/**
 * WHY THIS CHANGED FROM THE OPENROUTER VERSION
 *
 * The old implementation passed a raw JSON Schema object to OpenAI's
 * Responses API (`text.format.json_schema`, `strict: true`,
 * `additionalProperties: false`) - a Responses API feature. NVIDIA NIM only
 * exposes the Chat Completions API (POST /v1/chat/completions), which
 * doesn't have that mechanism.
 *
 * `llm.withStructuredOutput(architectureSchema, ...)` replaces it: LangChain
 * builds a schema-constrained request using whatever structured-output
 * method the target model supports (tool-calling by default, or
 * `response_format: json_object` via `method: "jsonMode"`) and parses +
 * validates the result against the same Zod schema used for the
 * `Architecture` TypeScript type - so there's exactly one schema definition
 * now, not two kept in sync by convention.
 *
 * `method: "jsonMode"` is used here rather than the LangChain default
 * ("functionCalling") because tool/function-calling support is inconsistent
 * across NVIDIA's 100+ hosted models, while basic JSON-mode response
 * formatting is much more broadly supported by the vLLM backend NIM runs
 * on. If your chosen AI_MODEL has solid tool-calling support (check its
 * card at build.nvidia.com), switching to `method: "functionCalling"` gives
 * stricter schema adherence.
 */
export const architectTask = task({
  id: "architect-task",

  queue: aiQueue,

  // Tighter than the other stages' AI_RETRY - see AI_RETRY_ARCHITECT in
  // config/ai.ts for the worst-case wall-clock math this caps.
  retry: AI_RETRY_ARCHITECT,

  run: async (payload: { prompt: string }) => {
    logger.info("Generating architecture", { model: AI_MODELS.architect });

    const { temperature, maxOutputTokens, timeoutMs } = AI_LIMITS.architect;

    const structuredLlm = createLlm({
      model: AI_MODELS.architect,
      temperature,
      maxTokens: maxOutputTokens,
      timeoutMs,
    }).withStructuredOutput(architectureSchema, {
      name: "website_architecture",
      method: "jsonMode",
      includeRaw: true,
    });

    // If this consistently logs ~90000ms, the client-side timeout in
    // tools/langchain.ts IS engaging and abandoning the request right on
    // schedule - the real fix is a faster model (see AI_MODELS.architect),
    // not a longer timeout. If it logs something wildly different (a single
    // call past 90s with no error), the timeout isn't actually taking
    // effect in the running process - restart `trigger.dev dev` and clear
    // .trigger/tmp before assuming anything else is wrong.
    const startedAt = Date.now();
    const result = await structuredLlm.invoke(architectPrompt(payload.prompt));
    const elapsedMs = Date.now() - startedAt;

    logger.info("Architecture LLM call finished", {
      elapsedMs,
      usage:
        (result.raw.response_metadata as { tokenUsage?: unknown } | undefined)
          ?.tokenUsage ?? (result.raw as { usage_metadata?: unknown }).usage_metadata,
    });

    const finishReason = (
      result.raw.response_metadata as { finish_reason?: string } | undefined
    )?.finish_reason;

    if (finishReason === "length") {
      throw new Error(
        "Architecture generation was truncated before completing " +
          "(hit maxTokens). Increase AI_LIMITS.architect.maxOutputTokens " +
          "in src/config/ai.ts."
      );
    }

    if (!result.parsed) {
      // Unlike the old flow, a schema-validation failure now surfaces here
      // rather than as a downstream JSON.parse() crash - but the raw model
      // output is still worth logging for debugging a stubborn model.
      logger.error("Architect returned output that failed schema validation", {
        rawOutput: result.raw.content,
      });
      throw new Error(
        "Architect returned output that failed schema validation. See the " +
          "'Architect returned output that failed schema validation' log " +
          "entry for the raw model output."
      );
    }

    const plan: Architecture = architectureSchema.parse(result.parsed);

    if (!plan.pages?.length) {
      throw new Error("Architecture has no pages - nothing to generate.");
    }

    if (plan.pages.length > 1) {
      logger.warn(
        `Architecture planned ${plan.pages.length} pages, but this pipeline ` +
          `currently only generates pages[0]. See the "Multi-page generation" ` +
          `note in the architecture review for how to extend this.`
      );
    }

    return {
      plan,
      model: AI_MODELS.architect,
    };
  },
});
