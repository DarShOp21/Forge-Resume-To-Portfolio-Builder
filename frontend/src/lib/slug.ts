// Words that describe the document, not the person — stripped from both
// the slug and the display name so "Darshan_Resume_Final_2026.pdf" reads
// as "Darshan", not "Darshan Resume Final 2026".
const STOPWORDS = new Set([
  "resume",
  "cv",
  "final",
  "draft",
  "updated",
  "latest",
  "copy",
  "new",
  "v1",
  "v2",
  "v3",
]);

function tokensFromFileName(fileName: string): string[] {
  const withoutExtension = fileName.replace(/\.[^/.]+$/, "");
  return withoutExtension
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .filter((token) => !STOPWORDS.has(token) && !/^\d{4}$/.test(token));
}

/**
 * Turns a resume filename into a URL-safe slug for the generated site link,
 * with document-y words (resume, cv, final, a lone year) filtered out.
 * "Darshan_Resume_Final_2026.pdf" -> "darshan"
 * Falls back to a short random slug if nothing usable remains.
 */
export function slugFromFileName(fileName: string): string {
  const tokens = tokensFromFileName(fileName);
  if (!tokens.length) {
    return `portfolio-${Math.random().toString(36).slice(2, 7)}`;
  }
  return tokens.join("-");
}
