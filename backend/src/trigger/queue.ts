import { queue } from "@trigger.dev/sdk";

/**
 * concurrencyLimit is about how many AI calls trigger.dev will run at once
 * ACROSS ALL RUNS - it's a global brake, not a per-website setting. If you
 * stay on a rate-limited free OpenRouter model (see config/ai.ts), keep this
 * low enough that concurrent website-generation runs can't collectively
 * exceed that model's requests-per-minute limit; a paid model can raise this
 * for throughput.
 */
export const aiQueue = queue({
  name: "ai-queue",
  concurrencyLimit: 2,
});
