# Forge — landing page

A landing page for an AI resume-to-portfolio generator, built to the animation
spec you provided (trimmed and prioritized — see the notes below).

## Stack
React + TypeScript + Vite, GSAP + ScrollTrigger for motion, plain CSS
(no Tailwind) using a small design-token system in `src/index.css`.

## Run it

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build to dist/
npm run preview   # serve the production build locally
```

## Structure

```
src/
  hooks/
    useHeroAnimation.ts      # hero page-load entrance timeline
    useRevealAnimation.ts    # generic scroll-triggered reveal (cards, sections)
    useScrollTimeline.ts     # scroll-scrubbed pipeline visualization
    useParallax.ts           # subtle pointer-driven parallax
    usePrefersReducedMotion.ts
  lib/
    gsap.ts                  # single ScrollTrigger registration point
  components/
    Navbar.tsx               # transparent -> glass on scroll, mobile menu
    Hero.tsx                 # signature resume->site morph visual
    HowItWorks.tsx           # pipeline: resume.pdf -> ... -> deployed
    FeatureCards.tsx         # scroll reveal + tilt/glow hover
    UploadDemo.tsx           # drag/drop -> parsing -> success states
    Testimonials.tsx         # CSS-only marquee (deliberately not GSAP)
    Pricing.tsx
    FAQ.tsx                  # accordion, height animation
    Footer.tsx
  styles/sections.css        # all section styling, token-driven
  index.css                  # design tokens + resets
```

## Design decisions worth knowing about

**Name & concept**: called the product "Forge" for the copy, since the
original brief didn't name it — resumes get *forged* into sites. Swap freely.

**Palette**: near-black canvas (`--bg`), paper-white ink, and two accents that
trace the product's own transformation — amber (`--amber`, the paper/resume
state) shifting to teal (`--teal`, the shipped/live state). All six tokens
live at the top of `index.css`.

**Type**: Fraunces (display, used sparingly) + Inter (body) + JetBrains Mono
(pipeline labels, filenames, code-adjacent UI) — the mono face is grounded in
the fact that the product's stages are literally named after real file
extensions (`index.html`, `styles.css`, `script.js`).

**Signature element**: the hero's resume-card-morphs-into-a-website visual —
a scanline sweeps down a resume mockup, which dissolves into a live site
mockup, loops slowly. This is the whole product demonstrated in ~4 seconds
without a single line of explanatory copy.

**Cut from your original spec, on purpose** (see the critique earlier in
this conversation for the full reasoning):
- Testimonials marquee is CSS-only, not GSAP — an infinite JS-driven loop
  running continuously is a real battery/perf cost for something purely
  decorative; a CSS `@keyframes` loop gets the same effect for free and
  pauses natively via `:hover`.
- Micro-interactions (button ripples, icon pulses, link underlines) are
  plain CSS transitions, not GSAP timelines — GSAP is reserved for things
  that need sequencing or scroll-linking.
- Background effects are one ambient aurora gradient, not aurora + mesh +
  particles + noise stacked together — restraint was the actual ask in
  your reference list (Vercel/Linear/Stripe don't layer four ambient
  effects at once).
- Added a resume upload → parsing → deployed success flow as its own
  section, since for this product that's arguably the single most
  important animated moment, and your original spec only touched on it
  as a footnote under "Upload Area" micro-interactions.

## Accessibility
`prefers-reduced-motion` is checked in every GSAP hook — when it's set,
timelines are never constructed at all (elements land in their final state
via `gsap.set`) rather than being built and neutered after the fact. Focus
states are visible throughout (`:focus-visible`).

## What's still a placeholder
Copy, pricing figures, and testimonial names are illustrative — swap them
for your real content. The morph visual, pipeline, and upload demo are all
functional/animated but not wired to a real backend.
