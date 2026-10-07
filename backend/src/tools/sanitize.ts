/**
 * Every generation prompt in this project already says "Do NOT output
 * Markdown" / "Do NOT output explanations" - but instruction-following is a
 * probability, not a guarantee, especially on a small free-tier model. When
 * a model wraps its answer in ```html ... ``` anyway, the previous pipeline
 * shipped that straight into merge.ts, where a plain string.replace()
 * against "</head>"/"</body>" would either silently fail to find the tag
 * (because it's now preceded by a fence line) or - worse - "succeed" while
 * leaving stray fence markers and a stray language tag in the final output.
 *
 * This is a defensive backstop, not a replacement for good prompting: strip
 * a leading/trailing fenced code block if the model added one, regardless
 * of the language tag used.
 */
export function stripCodeFences(raw: string): string {
  const text = raw.trim();

  const fenced = text.match(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n?```$/);
  if (fenced) {
    return fenced[1].trim();
  }

  // Some models only fence the start (or only the end) if generation was
  // truncated mid-stream. Strip a lone leading/trailing fence line too.
  return text
    .replace(/^```[a-zA-Z0-9]*\n/, "")
    .replace(/\n?```$/, "")
    .trim();
}
