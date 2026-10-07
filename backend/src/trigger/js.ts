import { logger, task } from "@trigger.dev/sdk";
import { generateCode } from "../tools/ai";
import { AI_MODELS, AI_RETRY } from "../config/ai";
import { jsPrompt } from "../prompts/js";
import { aiQueue } from "./queue";
import { Architecture } from "../types/architecture";
import { Blueprint } from "../types/blueprint";

export const jsTask = task({
  id: "generate-js",

  queue: aiQueue,

  retry: AI_RETRY,

  run: async (payload: { prompt: string; architecture: Architecture; blueprint: Blueprint; html: string }) => {
    logger.info("Generating JS", { model: AI_MODELS.js });

    const js = await generateCode(
      jsPrompt(payload.prompt, payload.architecture, payload.blueprint, payload.html),
      "js"
    );

    return {
      file : {
        path : "script.js",
        content : js
      },
      model: AI_MODELS.js,
    };
  },
});
