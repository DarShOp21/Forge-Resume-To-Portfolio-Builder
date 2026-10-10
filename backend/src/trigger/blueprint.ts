import { logger, task } from "@trigger.dev/sdk";
import { aiQueue } from "./queue";
import { createLlm } from "../tools/langchain";
import { AI_LIMITS, AI_MODELS, AI_RETRY } from "../config/ai";
import { blueprintPrompt } from "../prompts/blueprint";
import { Architecture } from "../types/architecture";
import { Blueprint } from "../types/blueprint";

/**
 * Pulls a JSON object out of a model response that's *supposed* to be raw
 * JSON but isn't quite - wrapped in ```json fences, or a sentence of
 * preamble/postamble around the object.
 */
function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;

  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    throw new Error("No JSON object found in model output.");
  }

  return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
}

/**
 * Normalize older top-level fields into the website shape used by the
 * current prompt and schema. Existing nested values take precedence.
 */
function repairWebsiteNesting(blueprint: any): any {
  if (!blueprint?.website || typeof blueprint.website !== "object") {
    return blueprint;
  }

  const misnested = ["theme", "sections", "hero"];
  const repaired = { ...blueprint, website: { ...blueprint.website } };

  for (const key of misnested) {
    if (repaired.website[key] === undefined && repaired[key] !== undefined) {
      repaired.website[key] = repaired[key];
      delete repaired[key];
    }
  }

  for (const key of ["featuredProject", "featuredExperience"]) {
    const value = repaired.website[key] ?? repaired[key];
    if (repaired.website.content?.[key] === undefined && value !== undefined) {
      repaired.website.content = { ...repaired.website.content, [key]: value };
      delete repaired.website[key];
      delete repaired[key];
    }
  }

  return repaired;
}

/**
 * Runs after architectTask.
 *
 * Keep model-output handling permissive: extract JSON and normalize legacy
 * nesting, then require a non-empty website.sections array rather than full
 * schema validation. Blueprint remains the schema-inferred compile-time
 * type; other fields are not guaranteed to match it at runtime.
 */
export const blueprintTask = task({
  id: "blueprint-task",

  queue: aiQueue,

  retry: AI_RETRY,

  run: async (payload: { prompt: string; architecture: Architecture }) => {
    logger.info("Generating blueprint", { model: AI_MODELS.blueprint });

    const { temperature, maxOutputTokens, timeoutMs } = AI_LIMITS.blueprint;

    const llm = createLlm({
      model: AI_MODELS.blueprint,
      temperature,
      maxTokens: maxOutputTokens,
      timeoutMs,
    });

    const response = await llm.invoke(
      blueprintPrompt(payload.prompt, payload.architecture)
    );

    const finishReason = (
      response.response_metadata as { finish_reason?: string } | undefined
    )?.finish_reason;

    if (finishReason === "length") {
      throw new Error(
        "Blueprint generation was truncated before completing " +
          "(hit maxTokens). Increase AI_LIMITS.blueprint.maxOutputTokens " +
          "in src/config/ai.ts."
      );
    }

    const rawContent =
      typeof response.content === "string"
        ? response.content
        : JSON.stringify(response.content);

    const blueprint = repairWebsiteNesting(
      extractJsonObject(rawContent)
    ) as Blueprint;

    // Not schema validation - just enough of a sanity check that there's
    // something to render. See the comment above for why this stops here
    // rather than re-introducing full validation.
    if (!Array.isArray(blueprint?.website?.sections) || blueprint.website.sections.length === 0) {
      logger.error("Blueprint has no sections - nothing to render", {
        rawOutput: rawContent,
      });
      throw new Error("Blueprint has no sections - nothing to render.");
    }

    return {
      blueprint,
      model: AI_MODELS.blueprint,
    };
  },
});
