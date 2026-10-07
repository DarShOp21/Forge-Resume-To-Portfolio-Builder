import { logger, task } from "@trigger.dev/sdk";

/**
 * WHY THIS TASK EXISTS
 *
 * Nothing in the original pipeline ever checked whether the HTML, CSS, and
 * JS it produced actually referred to the same elements. Given three
 * separate model calls that were only *supposed* to agree via a shared
 * spec, "the CSS styles .hero-cta but the HTML rendered .cta-hero" is
 * exactly the kind of silent mismatch that shows up as "inconsistent
 * quality" without ever throwing an error.
 *
 * This is intentionally a lightweight, regex-based static check, not a
 * full HTML/CSS/JS parser (no new dependencies, runs in milliseconds). It
 * WILL have false positives/negatives around things like attribute
 * selectors, pseudo-classes, dynamically-built class strings in JS
 * (`el.classList.add(dynamicVar)`), or classes added by JS at runtime that
 * legitimately don't exist in the static HTML. Treat its output as
 * warnings to look at, not proof of correctness. If this project keeps
 * growing, swap it for a real parser (parse5 for HTML, postcss for CSS,
 * acorn/espree for JS) - the interface below deliberately returns
 * `warnings: string[]` so that swap doesn't change how callers use it.
 */

function extractHtmlClassesAndIds(html: string) {
  const classes = new Set<string>();
  const ids = new Set<string>();

  for (const m of html.matchAll(/\bclass\s*=\s*"([^"]*)"/g)) {
    m[1].split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
  }
  for (const m of html.matchAll(/\bid\s*=\s*"([^"]*)"/g)) {
    if (m[1]) ids.add(m[1]);
  }

  return { classes, ids };
}

function extractCssSelectorTokens(css: string) {
  // Strip comments and the contents of @media/@keyframes conditions before
  // scanning for .class / #id tokens in selectors.
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const classTokens = new Set<string>();
  const idTokens = new Set<string>();

  for (const m of withoutComments.matchAll(/\.([a-zA-Z0-9_-]+)/g)) {
    classTokens.add(m[1]);
  }
  for (const m of withoutComments.matchAll(/#([a-zA-Z0-9_-]+)/g)) {
    idTokens.add(m[1]);
  }

  return { classTokens, idTokens };
}

function extractJsSelectorTokens(js: string) {
  const classTokens = new Set<string>();
  const idTokens = new Set<string>();

  // querySelector('.foo'), querySelectorAll("#bar"), closest('.baz')
  for (const m of js.matchAll(/querySelectorAll?\(\s*['"`]([^'"`]+)['"`]/g)) {
    const sel = m[1];
    for (const c of sel.matchAll(/\.([a-zA-Z0-9_-]+)/g)) classTokens.add(c[1]);
    for (const i of sel.matchAll(/#([a-zA-Z0-9_-]+)/g)) idTokens.add(i[1]);
  }
  // getElementById('foo')
  for (const m of js.matchAll(/getElementById\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
    idTokens.add(m[1]);
  }
  // classList.add/remove/toggle/contains('foo')
  for (const m of js.matchAll(/classList\.(?:add|remove|toggle|contains)\(\s*['"`]([^'"`]+)['"`]/g)) {
    classTokens.add(m[1]);
  }

  return { classTokens, idTokens };
}

export const validateTask = task({
  id: "validate-output",

  run: async (payload: { html: string; css: string; js: string }) => {
    const warnings: string[] = [];

    // Defensive: this task exists to be a harmless, non-blocking check (see
    // the design note above) - if it ever receives a malformed payload (a
    // wrong field name upstream, a task that returned undefined), it should
    // report that as a warning, not crash the run three times via retries.
    const missing = (["html", "css", "js"] as const).filter(
      (key) => typeof payload[key] !== "string"
    );
    if (missing.length) {
      const warning = `validate-output received non-string payload for: ${missing.join(", ")} - skipping consistency checks.`;
      logger.warn(warning);
      return { warnings: [warning] };
    }

    const { classes: htmlClasses, ids: htmlIds } = extractHtmlClassesAndIds(payload.html);
    const { classTokens: cssClasses, idTokens: cssIds } = extractCssSelectorTokens(payload.css);
    const { classTokens: jsClasses, idTokens: jsIds } = extractJsSelectorTokens(payload.js);

    for (const c of cssClasses) {
      if (!htmlClasses.has(c)) {
        warnings.push(`CSS styles ".${c}" but no HTML element has that class.`);
      }
    }
    for (const id of cssIds) {
      if (!htmlIds.has(id)) {
        warnings.push(`CSS styles "#${id}" but no HTML element has that id.`);
      }
    }
    for (const c of jsClasses) {
      if (!htmlClasses.has(c)) {
        warnings.push(`JS references class ".${c}" but no HTML element has that class.`);
      }
    }
    for (const id of jsIds) {
      if (!htmlIds.has(id)) {
        warnings.push(`JS references id "#${id}" but no HTML element has that id.`);
      }
    }

    if (warnings.length) {
      logger.warn(`Found ${warnings.length} HTML/CSS/JS consistency warning(s)`, { warnings });
    } else {
      logger.info("HTML/CSS/JS consistency check passed with no warnings");
    }

    return { warnings };
  },
});
