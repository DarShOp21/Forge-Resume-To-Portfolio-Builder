import { logger, task } from "@trigger.dev/sdk";
import { htmlPrompt } from "../prompts/html";
import { AI_MODELS, AI_RETRY } from "../config/ai";
import { generateCode } from "../tools/ai";
import { aiQueue } from "./queue";
import { Architecture } from "../types/architecture";
import { Blueprint } from "../types/blueprint";

export const htmlTask = task({
  id : 'generate-html',

  queue: aiQueue,

  retry: AI_RETRY,

  run: async (payload: { prompt: string; architecture: Architecture; blueprint: Blueprint }) => {
    logger.info("Generating HTML", { model: AI_MODELS.html });

    const html = await generateCode(
      htmlPrompt(payload.prompt, payload.architecture, payload.blueprint), 
      "html"
    );

    return {
      file : {
        path : "index.html",
        content : html
      },
      model: AI_MODELS.html,
    };
  },
});
