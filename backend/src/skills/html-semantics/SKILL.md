---
name: html-semantics
description: Guidance for writing semantic, accessible, SEO-sound HTML5 markup from a fixed content/architecture spec, without inventing structure that isn't implied by it.
---

# HTML Semantics

You're translating a locked content spec (sections, components, ids, classes,
text) into a real HTML document. The spec is the source of truth for *what*
exists; this skill is about *how* to mark it up so it's correct, accessible,
and crawlable - not about adding or renaming anything.

## Pick tags by meaning, not by convenience

Reach for the tag whose meaning matches the content, before reaching for
`<div>`:
- `<header>` for intro/branding content at the top of a page or section.
- `<nav>` for a list of navigational links - wrap the `<ul>`, don't just add
  a class to one.
- `<main>` exactly once per page, wrapping the primary content.
- `<article>` for content that would make sense syndicated on its own (a
  blog post, a product card in a grid); `<section>` for a thematic grouping
  that needs a heading but isn't standalone.
- `<aside>` for tangential content (a sidebar, a pull quote), `<footer>` for
  closing/meta content.
- `<button>` for anything that performs an action in place; `<a href>` only
  for anything that navigates (including same-page anchors). Never a `<div
  onclick>` for either.
- `<figure>` + `<figcaption>` when an image has a caption, not a bare `<img>`
  followed by a styled `<p>`.

A wrapper that exists purely for layout (a centered max-width container, a
flex row) is legitimately a `<div>` - semantics apply to content, not to
every element on the page.

## Heading structure carries meaning, not size

Headings (`h1`-`h6`) describe document outline, independent of how large
they render. One `h1` per page. Don't skip levels to get a smaller-looking
heading - style the smaller size in CSS and keep the heading level correct
for its place in the outline. A section's heading is one level below the
heading of the section it's nested in, not one level below whatever looks
right visually.

## Accessibility is inferred, not spelled out

The architecture spec will describe *what* a component is, not its
accessibility attributes - inferring the standard ones for the element
you're building is expected:
- Every `<img>` needs `alt`; purely decorative images get `alt=""`, not a
  missing attribute.
- Icon-only controls (a hamburger button, a close "x") need `aria-label`
  describing the action, since there's no visible text to name it.
- Form inputs need an associated `<label>` (via `for`/`id` or wrapping) -
  a placeholder is not a label.
- A toggle that shows/hides content (mobile menu, accordion, dropdown)
  needs `aria-expanded` on the trigger, kept in sync by the JS that drives
  it - this is a contract between the HTML you write and the JS stage that
  runs after it, so the attribute needs to exist even though the JS hasn't
  been generated yet.
- Elements that are only ever operated by mouse (a `<div>` styled to look
  clickable) are the wrong tag - see the `<button>`/`<a>` rule above; this
  is usually cheaper to fix at the tag level than to patch with ARIA.
- Skip decorative flourishes (a background blob, a divider glyph) from the
  accessibility tree with `aria-hidden="true"` so screen readers don't
  announce noise that carries no content.

## Metadata people never see still matters

- `<title>` should be specific to the page/brand, not a generic placeholder.
- A `<meta name="description">` summarizing the page in one sentence helps
  both search engines and social link previews.
- `lang` on `<html>` should match the actual content language.
- Meaningful, human-readable link text ("View pricing," not "click here" or
  a bare URL) - screen reader users often navigate by jumping between links
  in isolation, so the text has to make sense out of context.

## Don't let markup imply something false

An empty state, a loading placeholder, or a section with no real content
yet still needs real markup - don't leave a `<div>` with no accessible name
where a person would expect content. If a section's content is genuinely
just a heading and one paragraph, that's a complete section - don't pad it
with placeholder elements to look more "complete."
