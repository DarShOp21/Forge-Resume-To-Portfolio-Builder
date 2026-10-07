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
 * The model has been observed nesting theme/sections/featuredProject/
 * featuredExperience/hero *inside* "website" instead of as siblings of it
 * (fixed primarily via a clearer prompt - see prompts/blueprint.ts - but
 * kept here too as a cheap safety net since we deliberately don't reject on
 * shape mismatches anymore). If those fields are missing at the top level
 * but present under `website`, hoist them up before the sections check.
 */
function repairWebsiteNesting(blueprint: any): any {
  if (!blueprint?.website || typeof blueprint.website !== "object") {
    return blueprint;
  }

  const misnested = ["theme", "sections", "featuredProject", "featuredExperience", "hero"];
  const repaired = { ...blueprint, website: { ...blueprint.website } };

  for (const key of misnested) {
    if (repaired[key] === undefined && repaired.website[key] !== undefined) {
      repaired[key] = repaired.website[key];
      delete repaired.website[key];
    }
  }

  return repaired;
}

/**
 * Runs after architectTask.
 *
 * DELIBERATELY NO SCHEMA VALIDATION HERE, BY REQUEST:
 * Earlier this task ran the model's output through
 * `blueprintSchema.safeParse(...)` and threw if it didn't match - that's
 * what was showing up as "Blueprint returned output that failed schema
 * validation" and blocking the run. This version just extracts the JSON
 * object and passes it straight through as `Blueprint`, unvalidated.
 *
 * What that trade-off actually means: `Blueprint` is still the Zod-inferred
 * TypeScript type for editor/compile-time purposes, but nothing at runtime
 * guarantees the object actually matches it anymore - a missing field, a
 * style value outside the enum, or a wrong type will now surface later, as
 * a less obvious failure in html/css/js generation (e.g. `blueprint.theme
 * .primaryColor` being undefined) instead of failing clearly and early
 * here. If that starts happening, the fix isn't to re-add
 * `blueprintSchema.safeParse` blindly (that's the behavior you just asked
 * to remove) - it's to make the *prompt* reliably produce the right shape
 * (tighter formatting instructions, a model with better native JSON/tool-
 * calling support) and validate again once it does, or to add narrow,
 * non-blocking checks for only the fields that matter most (e.g. `sections`
 * being a non-empty array, which is still checked below since without it
 * there's nothing to render).
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
    if (!Array.isArray(blueprint?.sections) || blueprint.sections.length === 0) {
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
