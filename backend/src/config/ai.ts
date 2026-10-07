/**
 * Centralized AI configuration.
 *
 * MODEL SELECTION:
 * All calls go through OmniRouter (see ../tools/langchain.ts).
 *
 * Each stage has its own env var override so swapping any one of them
 * is a config edit, not a code change:
 * - ARCHITECT_MODEL - Planning/architecture (needs reasoning)
 * - BLUEPRINT_MODEL - Distilling architecture to concrete decisions
 * - CODE_MODEL - HTML/CSS/JS generation (shared for all three)
 * - RESUME_MODEL - Structured extraction from resume text
 *
 * MODEL IDS (OmniRouter smart-routing - each "auto/*" id auto-selects
 * whichever provider you've configured credentials for, with fallback, so a
 * single missing provider never hard-fails a stage):
 * - "auto/best-reasoning" - Planning/reasoning (reasoning-capable)
 * - "auto/best-coding" / "auto/coding" - Code generation
 * - "auto/fast" / "auto/cheap" - Fast, cheap, deterministic extraction
 * - "auto/smart" - Balanced general-purpose
 *
 * To force free providers only, use the ":free" variants, e.g.
 * "auto/best-free" or "auto/coding:free". Browse the full catalog at the
 * OmniRouter dashboard (http://localhost:20128) or GET /v1/models.
 *
 * IMPORTANT - reasoning tokens eat the same output budget:
 * If you switch `architect` or `blueprint` to a "thinking"/reasoning model,
 * its reasoning tokens are billed out of the same `max_tokens` budget as
 * the final JSON. That's why `architect.maxOutputTokens` is set well above
 * the coding stages - keep that headroom if you introduce a reasoning model.
 */

export type StageName = "architect" | "blueprint" | "html" | "css" | "js" | "resume";

export const AI_MODELS: Record<StageName, string> = {
  // Architect needs reasoning and planning capability.
  // auto/best-reasoning routes to a reasoning-capable model (headroom for
  // thinking tokens is reserved in AI_LIMITS.architect below).
  architect: process.env.ARCHITECT_MODEL ?? "auto/best-reasoning",

  // Blueprint needs structured output and instruction following.
  blueprint: process.env.BLUEPRINT_MODEL ?? "auto/coding",

  // Code generation stages (HTML, CSS, JS) - need good code generation.
  html: process.env.CODE_MODEL ?? "auto/best-coding",
  css: process.env.CODE_MODEL ?? "auto/best-coding",
  js: process.env.CODE_MODEL ?? "auto/best-coding",

  // Structured extraction - deterministic, doesn't need creative capability.
  // auto/fast keeps this cheap and within the short timeout below.
  resume: process.env.RESUME_MODEL ?? "auto/fast",
};

export const AI_LIMITS: Record<
  StageName,
  { maxOutputTokens: number; temperature: number; timeoutMs: number }
> = {
  // Higher ceiling: kept high in case a reasoning model is swapped in here -
  // its thinking tokens come out of this same budget before the final JSON.
  // Longer timeout: architect needs time for reasoning and planning.
  architect: { maxOutputTokens: 20000, temperature: 0.1, timeoutMs: 1200_000 },

  // Smaller output than architect (this schema is much flatter), but a bit
  // more temperature than the coding stages - hero copy benefits from some
  // creative range, while the enum/hex/font fields stay well-constrained by
  // the schema itself.
  blueprint: { maxOutputTokens: 20000, temperature: 0.2, timeoutMs: 900_000 },

  // Code generation stages - moderate output, low temperature for consistency
  html: { maxOutputTokens:30000, temperature: 0.2, timeoutMs: 1500_000 },
  css: { maxOutputTokens: 30000, temperature: 0.2, timeoutMs: 1500_000 },
  js: { maxOutputTokens: 30000, temperature: 0.2, timeoutMs: 1500_000 },

  // Deterministic structured extraction - temperature 0, and a much shorter
  // timeout/output budget than the creative stages since it's just parsing.
  // Increased timeout for NVIDIA NIM which may have higher latency.
  resume: {
    maxOutputTokens: 40096,
    temperature: 0,
    timeoutMs: 300000,
  },
};

// Applied uniformly to every AI-calling task via the task's `retry` option,
// EXCEPT architect - see AI_RETRY_ARCHITECT below.
export const AI_RETRY = {
  maxAttempts: 5,
  factor: 2,
  minTimeoutInMs: 2_000,
  maxTimeoutInMs: 1500_000,
  randomize: true,
};

// Tighter than AI_RETRY: with the 45s timeout above, worst case here is
// roughly 3 x 45s + backoff(2s+4s) ≈ 141s (~2.5 min) instead of the ~8-9
// minutes the default 5-attempt/90s-timeout combination allows. If
// architect is still consistently failing even within this tighter bound,
// that's a strong signal to switch AI_MODELS.architect to a faster model
// rather than to loosen these numbers back up.
export const AI_RETRY_ARCHITECT = {
  maxAttempts: 3,
  factor: 2,
  minTimeoutInMs: 2_000,
  maxTimeoutInMs: 1200_000,
  randomize: true,
};
