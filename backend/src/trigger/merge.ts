import { logger, task } from "@trigger.dev/sdk";

/**
 * WHY THIS WAS REWRITTEN
 *
 * The original did payload.html.replace("</head>", ...) and
 * .replace("</body>", ...) - two plain, case-sensitive, exact-string
 * replacements with no verification that either one actually matched. If
 * the model emitted "</HEAD>", added a stray space, or (despite
 * instructions) wrapped the whole document in a markdown fence, `.replace`
 * silently returns the original string unchanged and the task reports
 * "Website generated successfully" for a page with no CSS and no JS at
 * all. That's a silent failure mode masquerading as success - exactly the
 * kind of thing that looks like "inconsistent quality" from the outside.
 *
 * This version matches the closing tags case-insensitively, falls back to
 * inserting before </html> if </head>/</body> aren't found, and - if it
 * genuinely can't find anywhere to inject - throws instead of returning a
 * silently-broken document.
 */

function injectBeforeClosingTag(html: string, tagName: "head" | "body", injected: string): string {
  const closingTagRegex = new RegExp(`</\\s*${tagName}\\s*>`, "i");

  if (closingTagRegex.test(html)) {
    return html.replace(closingTagRegex, `${injected}</${tagName}>`);
  }

  // Fallback: no </head> or </body> found at all (malformed/truncated HTML).
  // Try inserting before </html> so the asset isn't silently dropped.
  const closingHtmlRegex = /<\/\s*html\s*>/i;
  if (closingHtmlRegex.test(html)) {
    logger.warn(`No closing </${tagName}> tag found - inserting before </html> instead.`);
    return html.replace(closingHtmlRegex, `${injected}</html>`);
  }

  throw new Error(
    `Could not find </${tagName}> or </html> in the generated HTML - the document ` +
      `appears malformed or truncated. Refusing to silently ship a broken page.`
  );
}

export const mergeTask = task({
  id: "merge-files",

  run: async (payload: { html: string; css: string; js: string }) => {
    let finalHtml = injectBeforeClosingTag(payload.html, "head", `<style>${payload.css}</style>`);
    finalHtml = injectBeforeClosingTag(finalHtml, "body", `<script>${payload.js}</script>`);

    // Verify the injections actually landed instead of trusting the regex
    // silently no-op'd somewhere upstream.
    if (!finalHtml.includes("<style>") || !finalHtml.includes("<script>")) {
      throw new Error("Merge completed but CSS/JS injection could not be verified in the output.");
    }

    return { finalHtml };
  },
});
