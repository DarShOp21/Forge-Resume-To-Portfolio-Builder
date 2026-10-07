/**
 * WHY THIS WAS REWRITTEN
 *
 * Two changes from the original:
 *
 * 1. Biggest one: this prompt now receives the ACTUAL generated HTML, not
 *    just the abstract architecture JSON. Previously, HTML and CSS were
 *    generated in parallel from the same spec but never saw each other's
 *    real output - two independent guesses at "what classes/ids exist"
 *    that were only accidentally consistent when the model followed the
 *    architecture perfectly. Since CSS is now generated AFTER html.ts
 *    finishes (see trigger/parent.ts), every selector here can be checked
 *    against markup that actually exists, not markup we hope exists.
 * 2. The original listed ~20 required CSS categories (buttons, forms,
 *    cards, navigation, carousels-via-animations, etc.) regardless of
 *    whether the page has any of those elements. That's a availability-bias
 *    trap for a small model: given a long menu of "things to style", it
 *    tends to style things that were never asked for. This version says
 *    "style what exists in the HTML," full stop.
 */
import { Architecture } from "../types/architecture";
import { Blueprint } from "../types/blueprint";
import { loadSkill } from "../skills/loader";

// Only the parts of the design skill that are about writing actual CSS -
// the selector-specificity gotcha and the "quality floor" checklist - not
// the palette/typography guidance, since design tokens are already locked
// in by the architect stage by the time this prompt runs.
function cssGuidance(): string {
  const craftsmanship = loadSkill("css-craftsmanship");
  const specificityNote =
    "Prefer flat, predictable selectors. Avoid deep nesting that causes accidental specificity battles. Style sections and components according to their actual HTML classes and ids only.";
  return `${specificityNote}\n\n${craftsmanship}`;
}

export const cssPrompt = (
  userPrompt: string,
  architecture: Architecture,
  blueprint: Blueprint,
  html: string
) => `
You are a senior frontend engineer and design-system implementer writing production CSS for the exact HTML below.

Your job is not just to color the page. Your job is to faithfully implement the design intent encoded in:
- designSystem
- designDirectives
- pages[0].sections
- components
- implementationNotes

CSS guidance:
${cssGuidance()}

Design tokens:
${JSON.stringify(architecture.designSystem, null, 2)}

Design directives:
${JSON.stringify(architecture.designDirectives, null, 2)}

Section plan:
${JSON.stringify(architecture.pages?.[0]?.sections ?? [], null, 2)}

Components:
${JSON.stringify(architecture.components, null, 2)}

Implementation notes:
${JSON.stringify(architecture.implementationNotes, null, 2)}

Rules:
1. Return ONLY raw CSS - no markdown fences, no comments, no explanation.
2. Every selector must match something that actually exists in the HTML below, except :root and standard element selectors used for reset/base styles.
3. Create CSS custom properties in :root from designSystem and use them consistently.
4. Implement the visual intent from designDirectives explicitly:
   - visual hierarchy
   - layout rhythm
   - alignment strategy
   - density
   - surface style
   - border style
   - button style
   - card style
   - motion style
5. Do not invent a new aesthetic not present in the architecture.
6. Respect antiPatterns and mustAvoid strictly.
7. Use mobile-first responsive CSS using the provided breakpoints.
8. Include a minimal reset, base typography, layout, component styles, states, and responsive overrides.
9. Use flexbox/grid for layout. Avoid fixed widths except where semantically necessary.
10. Only style interactive states for interactive elements that exist in the HTML.
11. No !important. No duplicate selectors. No dead selectors.
12. Prefer flat, maintainable selectors over deep nesting.
13. Make the result look polished and intentional, not templated or beginner-like.
14. Use the section metadata ("layout", "emphasis", "variant", "purpose") to vary rhythm and hierarchy across the page instead of giving every section the same treatment.
15. The blueprint below is the final word on theme: set --color-primary, --color-secondary, and --color-accent from blueprint.website.theme.primaryColor, secondaryColor, and accentColor; set heading and body font-family from blueprint.theme.headingFont and bodyFont; and set the base background/text colors to match blueprint.theme.mode ("light" or "dark") even if architecture.designSystem suggested something slightly different - blueprint is the more recent, final decision.
16. Give the section matching blueprint.featuredProject or blueprint.featuredExperience a visually distinct, more prominent treatment than other sections of the same type.
17. Gradient: also set --gradient-from and --gradient-to custom properties from blueprint.theme.gradientFrom/gradientTo. Only apply this gradient where architecture.designDirectives.gradientUsage says to (e.g. a "background: linear-gradient(...)" behind the hero, a "background-clip: text" gradient on one heading, or a gradient border on the featured card) - never splash it across every section, every card, or every button.
18. Custom cursor CSS (only if the HTML contains .cursor-dot/.cursor-ring elements):
   - On the root or body, set "cursor: none;" but ONLY inside a "@media (hover: hover) and (pointer: fine)" block, so touch/coarse-pointer devices keep their native cursor untouched.
   - Style .cursor-dot and .cursor-ring as "position: fixed; top: 0; left: 0; pointer-events: none; z-index: 9999;" with transform-based positioning (script.js will set transforms via GSAP), sized and colored from the theme (e.g. dot uses --color-accent, ring is a soft outline). Consider "mix-blend-mode: difference" for a dot/ring that stays visible over any background.
   - Add hover-state classes the JS will toggle, e.g. ".cursor-ring.is-link", ".cursor-ring.is-view", ".cursor-ring.is-drag", each scaling/recoloring the ring distinctly (per architecture.designDirectives.cursorSectionBehavior). If a .cursor-label exists, style it centered inside the ring, hidden by default and shown only for the "view" state.
   - Wrap all custom-cursor rules so they have no effect when JS hasn't added a "cursor-read" class to <html> (e.g. gate the "cursor: none" rule on "html.cursor-ready"), so the page still shows a normal cursor if JavaScript fails to load.
19. Scroll-reveal base CSS (only for elements carrying "data-reveal" in the HTML): give them a sensible initial hidden/offset state via CSS (e.g. "opacity: 0; transform: translateY(...)") so there is no flash-of-unstyled-content before GSAP/Motion animates them in, but wrap this initial state in "@media (prefers-reduced-motion: no-preference)" (or gate it behind a "js-ready" class added by script.js) so that if JavaScript never runs, or the user prefers reduced motion, the content is simply visible and static rather than permanently hidden.
20. Grain overlay CSS (only if the HTML contains .grain-overlay elements): make it "position: absolute; inset: 0; pointer-events: none;" with a subtle SVG-noise "background-image" (a data-URI "<svg>" with a "feTurbulence" filter is acceptable here since it is a CSS value, not injected markup) at low opacity (roughly 0.04-0.08) and "mix-blend-mode: overlay" or "soft-light", so it reads as a faint film-grain texture rather than visible static.
21. Respect "prefers-reduced-motion: reduce" globally: under that query, disable the custom cursor ("cursor: auto !important" is not allowed by rule 11's no-!important policy, so instead scope the whole "cursor: none"/cursor-hiding rule inside "media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"), and ensure "data-reveal" elements have no CSS-driven offset/opacity in that case either.


HTML to style:
${html}

User request:
${userPrompt}

Blueprint (final theme values - see rule 15):
${JSON.stringify(blueprint, null, 2)}
`;
