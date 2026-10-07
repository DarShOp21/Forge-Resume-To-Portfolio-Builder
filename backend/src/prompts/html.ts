/**
 * WHY THIS WAS REWRITTEN
 *
 * The original prompt said, in the same breath: "do not invent containers",
 * "do not invent classes", and "produce clean, properly indented HTML" -
 * but a real layout (a centered max-width content area, a flex/grid wrapper
 * around a nav, a card grid wrapper) almost always needs structural wrapper
 * elements that an architecture spec at the section/component level will
 * never enumerate one-for-one. The old prompt gave the model no legal way
 * to write normal HTML without "inventing" something, which likely pushed
 * it toward either (a) flat, unstyleable markup with no wrappers, or
 * (b) ignoring the rule outright and adding structure inconsistent with
 * what the CSS/JS prompts (which got the *same* "don't invent" instruction
 * against the *same* spec) assumed. This version draws the line explicitly:
 * the IDs/classes/content in the architecture are fixed; purely structural
 * wrapper elements needed to lay them out are allowed and expected.
 */
import { loadSkill } from "../skills/loader";
import { Architecture } from "../types/architecture";
import { Blueprint } from "../types/blueprint";

function htmlGuidance(): string {
  return loadSkill("html-semantics");
}

export const htmlPrompt = (userPrompt: string, architecture: Architecture, blueprint: Blueprint) => `
You are a senior frontend engineer writing semantic, accessible HTML.

The architecture below is the single source of truth for:
- what exists on the page
- what each section/component is for
- the intended emphasis and layout of each section

You may add neutral structural wrappers when needed for layout, but you may NOT invent new sections, rename ids/classes, or contradict the architecture.

Markup guidance:
${htmlGuidance()}

Rules:
1. Return ONLY the raw HTML document - no markdown fences, no comments, no explanation.
2. Produce one complete HTML5 document with:
   - <!DOCTYPE html>
   - <html lang="en">
   - <head> with charset, viewport, title from seo.metaTitle or project.title, meta description, stylesheet link to "./style.css"
   - <body>
3. Include semantic structure: header, main, footer where appropriate.
4. Render every section in pages[0].sections in order, using the exact tag, id, and className provided.
5. Render every component using the exact id/className/tag provided, nested where its purpose and belongsToSection imply.
6. You may add neutral wrappers such as .container, .stack, .cluster, .grid only if they do not replace required ids/classes and are clearly structural.
7. Treat "layout", "variant", "purpose", and "emphasis" as implementation instructions for nesting and structure.
8. Use proper accessibility attributes: alt text, labels, aria-label, landmark semantics, button type, list semantics, heading hierarchy.
9. Ensure every interaction selector in architecture.interactions exists in the HTML exactly.
10. Do not inline CSS or JavaScript.
11. Before the closing </body>, in this exact order: the GSAP CDN scripts, then the Motion CDN module snippet, then <script src="./script.js"></script>. Use:
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
   <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
   <script type="module">
     import { animate, stagger, scroll, inView } from "https://cdn.jsdelivr.net/npm/motion@11/+esm";
     window.Motion = { animate, stagger, scroll, inView };
   </script>
   <script src="./script.js"></script>
   script.js itself must be a plain (non-module) script so it can rely on the GSAP globals and the window.Motion object being defined above it.
12. The result must be suitable for a production-looking single-page site, not a wireframe.
13. Custom cursor markup: unless architecture.designDirectives.cursorStyle is "default", add exactly this markup as the first children of <body>, before the header:
   <div class="cursor-dot" aria-hidden="true"></div>
   <div class="cursor-ring" aria-hidden="true"></div>
   If cursorStyle is "label-reveal", also add a <span class="cursor-label" aria-hidden="true"></span> inside .cursor-ring for the hover-text (e.g. "View", "Open") to be injected into by script.js. These elements are decorative only (aria-hidden) and must never contain real content or be required to use the site.
14. Cursor state hooks: add a "data-cursor" attribute to elements that should change the cursor's appearance on hover - e.g. "data-cursor="link" on nav links and buttons, "data-cursor="view"" on project/work cards or links that open something, "data-cursor="text""" over large body-copy blocks if relevant, "data-cursor="drag"" only if there is an actual draggable/carousel element. Do not add data-cursor to every element - only where architecture.designDirectives.cursorSectionBehavior calls for a distinct state. Also add "data-cursor-zone" to each top-level section with a short value matching the section id, so script.js can detect which section is in view and adjust the cursor/theme accordingly.
15. Reveal hooks: add a "data-reveal" attribute (value one of "fade-up", "fade-up-stagger", "clip-reveal", "split-text" per architecture.designDirectives.revealStyle) to the hero heading, section headings, and card/grid containers that should animate in on scroll, per the blueprint and architecture's motion decisions. Do not add data-reveal to every single element - reserve it for the elements the architecture actually intends to draw attention to.
16. Magnetic buttons: add "data-magnetic" to the primary hero CTA and any other single, prominent call-to-action buttons (not on every button) so script.js can apply a magnetic hover pull.
17. Grain overlay markup: for each section id listed in blueprint.grainSections (if any), add a single empty ""<div class="grain-overlay" aria-hidden="true"></div>"" as the first child inside that section, positioned for a full-bleed overlay via CSS. Do not add this to sections not listed in blueprint.grainSections.

User request:
${userPrompt}

Architecture:
${JSON.stringify(architecture, null, 2)}

Blueprint (final decisions - render sections in exactly this order, use theme colors/fonts as the CSS custom property values, use hero.headline/subheading/cta as the hero copy, mark whichever section corresponds to featuredProject/featuredExperience as the emphasized one, use theme.cursorStyle to decide which cursor markup to include per rule 13, and use theme.grainSections to decide which sections get the grain overlay markup per rule 17):
${JSON.stringify(blueprint, null, 2)}
`;
