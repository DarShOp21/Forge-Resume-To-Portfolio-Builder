import { Architecture } from "../types/architecture";
import { Blueprint } from "../types/blueprint";
import { loadSkill } from "../skills/loader";

function jsGuidance(): string {
  const interactivity = loadSkill("js-interactivity");
  const guardrails = `
Write plain, maintainable vanilla JavaScript for all functional interactions (the stuff in architecture.interactions).
Prefer small named functions over one large script.
Use event delegation when multiple matching elements may exist.
Never assume a selector exists - guard every query before use.
Do not add visual design decisions in JavaScript unless an interaction explicitly requires class toggling or state updates.
Keep behavior progressively enhanced: if JavaScript fails, the page should remain structurally usable.

In addition to functional interactions, this script is also responsible for the site's motion system (custom cursor, scroll reveals, magnetic buttons), which - unlike the rest of this file - is allowed to use the GSAP and Motion libraries already loaded as globals by the HTML document (gsap, ScrollTrigger, window.Motion). Do not import or load any other external library, and do not use frameworks, TypeScript syntax, ES module imports inside script.js itself, jQuery, localStorage/sessionStorage/cookies, or alert/confirm/prompt.
`;
  return `${interactivity}\n\n${guardrails}`;
}

export const jsPrompt = (
  userPrompt: string,
  architecture: Architecture,
  blueprint: Blueprint,
  html: string
) => `
You are a senior JavaScript engineer writing production-quality vanilla JavaScript for the exact HTML document below.

Your only job is to implement the interactions defined in the architecture.
Do not invent extra functionality.
Do not redesign the page in JavaScript.

Scripting guidance:
${jsGuidance()}

Interactions to implement:
${JSON.stringify(architecture.interactions, null, 2)}

Implementation notes:
${JSON.stringify(architecture.implementationNotes, null, 2)}

Relevant design directives:
${JSON.stringify(
  {
    motionStyle: architecture.designDirectives.motionStyle,
    mustAvoid: architecture.designDirectives.mustAvoid,
    antiPatterns: architecture.designDirectives.antiPatterns,
  },
  null,
  2
)}

Rules:
1. Return ONLY raw JavaScript - no markdown fences, no explanation, no surrounding text.
2. Wrap all setup in a single DOMContentLoaded listener.
3. Only query selectors that actually exist in the HTML below. Guard every query before using it.
4. Implement only the interactions listed in architecture.interactions. If the array is empty, return a minimal valid script with no behavior.
5. Use const/let, addEventListener, querySelector/querySelectorAll, closest, classList, dataset, and small helper functions where useful.
6. Prefer event delegation for repeated or list-like UI.
7. Do not modify the HTML structure unless an interaction explicitly requires creating/removing an element.
8. Do not inject inline styles. Prefer toggling existing classes, ARIA attributes, data attributes, disabled states, hidden states, or text content when needed.
9. If an interaction implies UI state, keep that state minimal and local.
10. Do not use frameworks, TypeScript syntax, ES module syntax, imports, jQuery, or any external library other than the gsap/ScrollTrigger/window.Motion globals already loaded by the HTML document (see the Motion system section below) - do not add a <script> tag or import statement of your own.
11. Do not use localStorage, sessionStorage, IndexedDB, or cookies unless the user explicitly requested persistence.
12. Do not use alert(), confirm(), or prompt() unless the interaction explicitly requires a browser dialog. Browser prompt dialogs should be used sparingly because they block interaction with the rest of the page. [web:53][web:52]
13. For forms:
    - prevent default only when the described behavior requires client-side handling
    - validate only what the interaction explicitly implies
    - update accessible states when relevant (aria-expanded, aria-hidden, disabled, hidden)
14. For toggles, accordions, tabs, menus, and disclosures:
    - keep keyboard-safe behavior where relevant
    - keep state synchronized via classes and ARIA attributes
15. Code must fail gracefully. Missing elements must never throw runtime errors.
16. Keep the file concise. No dead code, no placeholder TODOs, no speculative utilities.

Motion system requirements (cursor, scroll reveals, magnetic buttons):
This is in addition to, not instead of, the functional interactions above. Implement it inside the same DOMContentLoaded listener, guarded so it never breaks if an element is missing or a library failed to load.

A. Setup and safety:
   - Detect touch/coarse-pointer devices with \`window.matchMedia("(hover: hover) and (pointer: fine)").matches\` and skip the entire custom-cursor system (do not add cursor-ready) if false.
   - Detect \`window.matchMedia("(prefers-reduced-motion: reduce)").matches\` and, if true, skip the custom cursor AND skip GSAP/Motion-driven scroll reveals and magnetic buttons entirely - instead just ensure all \`[data-reveal]\` elements are immediately visible (no opacity/transform manipulation).
   - Guard every use of \`gsap\`, \`ScrollTrigger\`, and \`window.Motion\` behind a \`typeof gsap !== "undefined"\` / \`typeof window.Motion !== "undefined"\` style check so a failed CDN load never throws.
   - If \`typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined"\`, call \`gsap.registerPlugin(ScrollTrigger)\` once.

B. Custom cursor (only if .cursor-dot and .cursor-ring exist in the HTML, hover-capable, and motion is not reduced):
   - Add a \`cursor-ready\` class to \`document.documentElement\` so the CSS custom-cursor rules activate.
   - On \`pointermove\`, update the dot's position immediately (e.g. via \`gsap.to\`/\`gsap.quickTo\` with a very short duration) and the ring's position with a slightly slower/eased follow (a longer duration or a spring-like ease) so the ring visibly trails the dot.
   - Use event delegation on \`document\` for \`pointerover\`/\`pointerout\` (or \`mouseenter\`/\`mouseleave\` with delegation via \`closest\`) on any element with a \`data-cursor\` attribute, toggling matching classes on \`.cursor-ring\` (and \`.cursor-dot\` if relevant) such as \`is-link\`, \`is-view\`, \`is-drag\`, \`is-text\` based on the attribute's value, and remove them on leave.
   - If a \`.cursor-label\` element exists and the hovered element's \`data-cursor\` is "view" (or similar), set its text content to a short label (e.g. "View", "Open") drawn from a small mapping - do not fabricate long copy.
   - Use \`data-cursor-zone\` on each top-level section with an IntersectionObserver (or ScrollTrigger) to detect which section is currently in view and toggle a class on \`document.body\` like \`cursor-zone--{value}\` if, and only if, architecture.designDirectives.cursorSectionBehavior actually calls for the cursor to change appearance between sections (skip this if it does not).

C. Scroll reveals (only for elements with \`data-reveal\`, when GSAP+ScrollTrigger are available and motion is not reduced):
   - For \`data-reveal="fade-up"\`: animate from \`{ opacity: 0, y: 24 }\` to \`{ opacity: 1, y: 0 }\` with a ScrollTrigger firing once when the element enters the viewport (e.g. \`start: "top 85%"\`, no \`toggleActions\` that repeatedly replay unless it clearly improves the design).
   - For \`data-reveal="fade-up-stagger"\`: select the element's direct children (or a matching card selector within it) and animate them the same way with \`stagger: 0.08\`-\`0.12\`.
   - For \`data-reveal="clip-reveal"\`: animate a clip-path or scaleX/scaleY reveal (e.g. from \`clip-path: inset(0 100% 0 0)\` to \`inset(0 0 0 0)\`) rather than opacity.
   - For \`data-reveal="split-text"\`: split the element's text into word-level \`<span>\` elements at runtime (wrap each word, preserve spacing), then stagger-animate each word up and in. Only do this DOM manipulation for elements explicitly marked \`data-reveal="split-text"\` - never restructure other text.
   - Always set a sensible initial state via GSAP \`gsap.set(...)\` before the ScrollTrigger fires, so nothing flashes unstyled.

D. Magnetic buttons (only for elements with \`data-magnetic\`, when GSAP is available, hover-capable, and motion is not reduced):
   - On \`pointermove\` within the button's bounds, compute the offset from center and move the button a fraction of that offset (e.g. 20-30%) via \`gsap.to\`, and on \`pointerleave\` animate it back to \`{ x: 0, y: 0 }\` with a slight ease/overshoot.
   - Keep the effect subtle - a few pixels to ~15px of travel, never enough to make the button hard to click or to shift layout.

Behavior mapping requirements:
- Treat each interaction object as authoritative.
- "selector" will point to an id or class that must already exist in the HTML.
- "event" tells you which listener to attach.
- "behavior" tells you what to implement in plain language.
- "target", if present, indicates the secondary element affected by the interaction.
- "progressiveEnhancement" indicates the behavior should preserve a usable non-JS fallback.

Implementation style requirements:
- Start with document.addEventListener("DOMContentLoaded", () => { ... });
- Inside, create small helper functions only if they are reused or improve clarity.
- If multiple interactions share logic, extract a helper.
- Use semantic state updates where possible:
  - toggle aria-expanded for expandable controls
  - toggle hidden or aria-hidden for revealed panels
  - toggle disabled for temporary disabled states
  - update textContent only when behavior explicitly implies it
- If a submit interaction only needs a lightweight demo behavior, do not fabricate network requests unless the user request explicitly asked for them.

If architecture.interactions is empty, return exactly this:
document.addEventListener("DOMContentLoaded", () => {});

User request:
${userPrompt}

Architecture:
${JSON.stringify(architecture, null, 2)}

Blueprint (for context only - featuredProject/featuredExperience may inform which element an interaction like "scroll to" or "highlight" should target):
${JSON.stringify(blueprint, null, 2)}

HTML the script will run against:
${html}
`;
