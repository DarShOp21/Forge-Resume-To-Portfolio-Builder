import { logger, task } from "@trigger.dev/sdk";
import { cssPrompt } from "../prompts/css";
import { AI_MODELS, AI_RETRY } from "../config/ai";
import { generateCode } from "../tools/ai";
import { aiQueue } from "./queue";
import { Architecture } from "../types/architecture";
import { Blueprint } from "../types/blueprint";

export const cssTask = task({
  id: "generate-css",

  queue: aiQueue,

  retry: AI_RETRY,

  // `html` is the actual markup generate-html produced, not just the
  // abstract architecture - see the "parallel generation" note in
  // trigger/parent.ts for why this changed.
  run: async (payload: { prompt: string; architecture: Architecture; blueprint: Blueprint; html: string }) => {
    logger.info("Generating CSS", { model: AI_MODELS.css });

    const css = await generateCode(
      cssPrompt(payload.prompt, payload.architecture, payload.blueprint, payload.html),
      "css"
    );

    return {
      file : {
        path : "style.css",
        content : css
      },     
      model: AI_MODELS.css,
    };
  },
});
