---
name: css-craftsmanship
description: Guidance for writing correct, maintainable, responsive CSS against a fixed HTML document and design-token set, without inventing selectors or fighting the cascade.
---

# CSS Craftsmanship

You're styling markup and design tokens that already exist and are fixed -
this skill is about writing CSS that actually applies, holds up across
screen sizes, and doesn't quietly conflict with itself.

## The cascade is the first bug to avoid

Two selectors that both match the same element don't add up - the more
specific one (or the later one, at equal specificity) wins entirely, which
silently drops rules from the loser. The most common way this bites in
practice: a class-only selector (`.card`) and a nested descendant selector
(`.grid .card`) both set `padding`, and only one of them actually applies.
Prefer flat, single-class selectors over nested descendant chains; when
nesting is genuinely needed (styling a child differently inside one
specific parent context), keep the specificity difference intentional and
comment why.

Never reach for `!important` to win a specificity fight - it means the
selector structure is wrong, and the next rule that needs to override this
one will need `!important` too, compounding the problem.

## Mobile-first, not desktop-then-shrink

Write the base (no media query) rules for the smallest viewport, then use
`min-width` media queries to add complexity as the viewport grows - not the
reverse. This keeps small-screen users from downloading and overriding
desktop-first assumptions, and tends to produce simpler mobile styles
because you're only adding, never subtracting.

Prefer layout that responds without a breakpoint at all before adding one:
`grid-template-columns: repeat(auto-fit, minmax(200px, 1fr))` reflows a card
grid at any width with zero media queries; a fixed column count needs a
breakpoint for every width where it stops looking right.

Avoid fixed pixel widths on layout containers and columns - use
percentages, `fr`, `minmax()`, or `clamp()` so the layout has room to
breathe between breakpoints instead of jumping at fixed points.

## Custom properties are the token system, not decoration

Define the design tokens once as CSS custom properties (`:root { --color-
primary: ...; --space-md: ...; }`), then reference the variable everywhere
a token value is used, never the literal again. This is what makes a later
"change the accent color" request a one-line edit instead of a find-and-
replace across the file - treat every hardcoded color, spacing, or font-size
value outside `:root` as a rule that should have been a variable reference.

## Motion and states are functional, not decorative

- Every interactive element needs a visible focus state - `:focus-visible`
  at minimum matching or exceeding the prominence of `:hover`. Removing the
  default outline without replacing it is a common accessibility break, not
  a cleanup.
- Respect `prefers-reduced-motion: reduce` for any animation beyond a subtle
  transition - wrap non-essential motion in
  `@media (prefers-reduced-motion: no-preference)`.
- Only add `:hover`/`:focus`/`:active`/`:disabled` states to elements that
  are actually interactive in the HTML - a hover state on static text or a
  decorative element is dead code that also signals false interactivity to
  the user.

## Only style what's actually there

Every selector should match something real in the HTML being styled - a
selector for a class or id that doesn't exist is either dead code (if
harmless) or a sign the HTML and CSS drifted from each other (if it was
supposed to do something). Don't add rules for elements, states, or
components "in case" they're needed; unstyled-but-present markup is a much
smaller problem than unmatched CSS silently doing nothing.

## Reset, then layer

Start with a minimal reset (`box-sizing: border-box` on everything, margin/
padding zeroed on the elements that need it) rather than a heavy universal
reset that fights the browser's sensible defaults for text elements. Group
the rest of the file in a consistent order - reset, base/typography,
layout, components, responsive overrides - so the cascade order in the file
matches the mental model of what overrides what.
