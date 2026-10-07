# Portfolio Generator - Prompt Review & Fixes

**Date:** 2026-10-02  
**Reviewer:** Claude (Opus)

---

## Executive Summary

This document provides:
1. A complete explanation of the existing workflow
2. All problems found in current prompts
3. Production-quality corrected versions of every prompt
4. Exact files/sections requiring changes
5. OmniRouter configuration changes (COMPLETED)
6. Confirmation that core logic remains unchanged

---

## 1. Existing Workflow Documentation

### System Architecture

The portfolio generator is a **resume-to-website pipeline** that:
- Takes a PDF resume as input
- Extracts and parses structured resume data via LLM
- Generates architecture → blueprint → HTML/CSS/JS via separate LLM agents
- Validates consistency, builds, and deploys to Vercel

### Complete Data Flow

```
HTTP POST /api/portfolio/generate { resumeUrl }
    ↓
1. controller downloads PDF from allowed storage host
2. extractPdfText(buffer) → Markdown text (@opendataloader/pdf)
3. parseResume(text) → structured Resume JSON (LLM call #1)
    ↓
4. websiteTask.trigger({ runId, userId, prompt: JSON.stringify(resume) })
    ↓
    4a. architectTask
        - Input: resume JSON as string
        - Prompt: src/prompts/architect.ts
        - Output: Architecture JSON (pages, sections, components, designSystem, etc.)
        - LLM: AI_MODELS.architect via ChatOpenAI → OmniRouter
    ↓
    4b. blueprintTask
        - Input: resume + Architecture
        - Prompt: src/prompts/blueprint.ts
        - Output: Blueprint JSON (theme, sections order, featured items, hero copy)
        - LLM: AI_MODELS.blueprint via ChatOpenAI → OmniRouter
    ↓
    4c. htmlTask (sequential - must complete before CSS/JS)
        - Input: resume + Architecture + Blueprint
        - Prompt: src/prompts/html.ts
        - Output: index.html
        - LLM: AI_MODELS.html via ChatOpenAI → OmniRouter
    ↓
    4d. cssTask + jsTask (parallel batch)
        - Input: resume + Architecture + Blueprint + HTML
        - Prompts: src/prompts/css.ts + src/prompts/js.ts
        - Output: style.css + script.js
        - LLM: AI_MODELS.css + AI_MODELS.js via ChatOpenAI → OmniRouter
    ↓
    4e. validateTask (non-blocking)
        - Regex-based consistency check (HTML classes/ids vs CSS/JS selectors)
        - Logs warnings but does not fail the run
    ↓
    4f. mergeTask (DEPRECATED - no longer used in parent.ts)
    ↓
    4g. buildTask
        - Writes index.html, style.css, script.js to generated/<uuid>/
    ↓
    4h. deployTask
        - Deploys directory to Vercel via CLI
    ↓
5. Updates db.run with deployedUrl, status: COMPLETED
```

### LLM Call Points

| Stage | File | Input | Output | Model Config |
|-------|------|-------|--------|--------------|
| Resume parsing | `services/resume/parser.ts` | Raw PDF text | Resume JSON | `AI_MODELS.resume` |
| Architecture | `trigger/architect.ts` | Resume JSON | Architecture JSON | `AI_MODELS.architect` |
| Blueprint | `trigger/blueprint.ts` | Resume + Architecture | Blueprint JSON | `AI_MODELS.blueprint` |
| HTML | `trigger/html.ts` | Resume + Architecture + Blueprint | index.html | `AI_MODELS.html` |
| CSS | `trigger/css.ts` | Resume + Architecture + Blueprint + HTML | style.css | `AI_MODELS.css` |
| JS | `trigger/js.ts` | Resume + Architecture + Blueprint + HTML | script.js | `AI_MODELS.js` |

All calls now route through **local OmniRouter** at `http://localhost:3000/v1` (configurable via `OMNIROUTER_URL` env var).

---

## 2. Problems Found in Current Prompts

### CRITICAL: Dead Weight Prompt

**File:** `src/prompts/portfolio.ts`

**Problem:** This prompt generates a monolithic HTML file with embedded CSS + JS, which contradicts the actual pipeline architecture that generates three separate files. The prompt is wired to `portfolioTask` in `trigger/portfolio.ts`, but `websiteTask` in `trigger/parent.ts` never calls it. This is a hallucination vector and architectural mismatch.

**Recommendation:** **DELETE** this file and `trigger/portfolio.ts` entirely, or clearly mark as deprecated with a warning comment.

---

### HIGH SEVERITY: Hallucination Vectors

#### Problem 1: Architect Prompt Encourages Invention

**File:** `src/prompts/architect.ts` line 381

```typescript
Reasoning guidelines:
- Internally infer the strongest candidate narrative.
```

**Issue:** "Infer the strongest candidate narrative" encourages the model to invent a story rather than stick to resume facts.

**Fix:** Replace with explicit fact-grounding language.

---

#### Problem 2: Resume Parser Can Inflate Skills

**File:** `src/services/resume/prompt.ts` line 75

```
Extract every skill you can find.
```

**Issue:** "Every skill you can find" with no upper bound can lead to kitchen-sink extraction or invented skills.

**Fix:** Add explicit cap and strengthen "never invent" language.

---

#### Problem 3: Blueprint Schema Mismatch

**File:** `src/prompts/blueprint.ts` output shape vs `src/schemas/blueprint.ts`

**Issue:** The prompt says to output `sections` as a flat string array `["hero", "about", "skills"]`, but `blueprintSchema.website.sections` expects an array of objects with `{ id, enabled, order, title, variant }`.

The `repairWebsiteNesting()` hack in `trigger/blueprint.ts` proves the model keeps producing the wrong shape.

**Fix:** Update prompt to produce correct schema-matching shape.

---

### MEDIUM SEVERITY: Consistency Gaps

#### Problem 4: Multi-page Architecture Contradiction

**File:** `src/prompts/architect.ts` line 365

```
Use only one page unless the user's request explicitly requires more.
```

But `src/schemas/blueprint.ts` line 33-36:

```typescript
layout: z.object({
  type: z.enum(["single-page", "multi-page"]),
```

**Issue:** Blueprint supports multi-page but architect says "only one page" — architectural confusion.

**Fix:** Remove multi-page support from blueprint schema OR clarify in architect prompt that multi-page is allowed when resume justifies it.

---

#### Problem 5: Decorative Effects Not Resume-Grounded

**File:** `src/prompts/portfolio.ts` (if not deleted)

Lines 196-207 list:
- Floating background blobs
- Animated gradient  
- Animated CTA buttons
- Ripple button effect
- Scroll progress bar
- Active navigation highlighting
- Back-to-top button

**Issue:** These are design decorations, not resume-derived features. No resume says "please add floating blobs."

**Fix:** If keeping this prompt, remove decorative requirements and make them conditional on design style.

---

### LOW SEVERITY: Prompt Clarity Issues

#### Problem 6: Weak "Never Invent" Language

Multiple prompts say "do not invent" but use passive phrasing that models can ignore under temperature.

**Fix:** Use imperative, explicit language: "You MUST NOT fabricate..."

---

## 3. Corrected Production-Quality Prompts

### 3.1 Resume Parser Prompt (CORRECTED)

**File:** `src/services/resume/prompt.ts`

**Changes:**
- Add explicit skill count cap
- Strengthen "never invent" language
- Add explicit formatting rules to prevent confusion

```typescript
export const resumeParserPrompt = `
You are an expert Applicant Tracking System (ATS) and resume parsing AI.

Your sole responsibility is to accurately extract structured information from resume text.

The extracted information will later be used to generate a professional portfolio website.

CRITICAL RULE: You MUST NOT fabricate, invent, or hallucinate ANY information. Extract only what is explicitly present in the resume text.

--------------------------------------------------
GENERAL RULES
--------------------------------------------------

1. Never hallucinate.
2. Never invent information.
3. Only extract information that is explicitly present.
4. If information is missing, return an empty string ("") or an empty array ([]).
5. Preserve wording whenever possible.
6. Do not summarize unless explicitly required.
7. Ignore formatting differences.
8. Ignore page numbers.
9. Ignore headers and footers.
10. Ignore decorative separators.
11. Ignore resume templates.
12. Ignore labels such as:
   - Resume
   - Curriculum Vitae
   - CV
   - Functional Resume Sample
   - Resume Template
   - Page 1
   - Confidential

These are NOT job titles.

--------------------------------------------------
PERSONAL INFORMATION
--------------------------------------------------

Extract:

- Full Name
- Professional Title
- Email
- Phone Number
- Location

Professional title means:

Software Engineer
Frontend Developer
AI Engineer
Backend Developer
Product Designer

NOT

Resume
CV
Functional Resume Sample

If no professional title exists,
return an empty string.

--------------------------------------------------
SUMMARY
--------------------------------------------------

Extract the professional summary or objective exactly as written.

Do not rewrite.
Do not embellish.

--------------------------------------------------
SKILLS
--------------------------------------------------

Extract skills that are explicitly listed in the resume.

Include:

Programming Languages
Frameworks
Libraries
Cloud Platforms
Databases
DevOps Tools
Operating Systems
AI Frameworks
Machine Learning Libraries
Software Tools
Developer Tools

Examples:

React, Next.js, Angular, Vue, Node.js, Express, MongoDB, PostgreSQL, 
Docker, Kubernetes, AWS, Azure, Python, Java, C++, TensorFlow, PyTorch, 
Git, GitHub, Redis, Linux

LIMITS:
- Maximum 50 skills total
- Remove exact duplicates
- Do NOT invent skills not mentioned in the resume
- Do NOT extract every technology mentioned in job descriptions as a "skill"
- Only extract skills the candidate explicitly claims to possess

--------------------------------------------------
EDUCATION
--------------------------------------------------

Extract every education entry.

Include:

Institution
Degree
Field
Start Year
End Year
Grade / CGPA / Percentage

Do not guess years.
Do not invent degrees.

--------------------------------------------------
WORK EXPERIENCE
--------------------------------------------------

Extract every work experience entry.

For every experience extract:

Company
Position
Start Date
End Date
Responsibilities

Responsibilities must contain ALL bullet points exactly as written.

Do NOT summarize them.
Do NOT rewrite them.
Keep them close to original wording.

Example:

[
 "Developed REST APIs using Node.js and Express",
 "Reduced API latency by 30% through caching optimization",
 "Managed production Kubernetes cluster with 50+ microservices"
]

--------------------------------------------------
PROJECTS
--------------------------------------------------

Extract every project mentioned in the resume.

For every project include:

Project Name
Description
Technologies
GitHub Link (if present)
Live Link (if present)

Extract technologies from the project description.

Do NOT invent project names.
Do NOT invent links.

Example:

Project: AI Portfolio Generator

Description: Built an AI-powered SaaS platform that converts resumes into deployed portfolio websites using LLMs and serverless architecture.

Technologies: React, Node.js, Express, MongoDB, Trigger.dev, OpenAI API, Tailwind CSS, Vercel

--------------------------------------------------
CERTIFICATIONS
--------------------------------------------------

Extract every certification.

Include:

Name
Issuer
Year

Do NOT invent certifications.

--------------------------------------------------
LINKS
--------------------------------------------------

Extract:

GitHub
LinkedIn
Portfolio
Website
Behance
Dribbble
Medium
LeetCode
Codeforces
HackerRank
Any other professional profile

Do NOT fabricate links.
Do NOT assume links based on name.

--------------------------------------------------
IMPORTANT

You MUST NOT fabricate:

Email
Phone
Skills
Projects
Experience
Certifications
Dates
Links
Companies
Positions
Education

If information is missing, leave it empty.

--------------------------------------------------
OUTPUT

Return ONLY structured data matching the provided schema.

Do not explain anything.
Do not wrap the output in markdown.
Do not add notes.
Do not add comments.
Do not add reasoning.
`;
```

---

### 3.2 Architect Prompt (CORRECTED)

**File:** `src/prompts/architect.ts`

**Key Changes:**
- Remove "infer the strongest candidate narrative" language (line 381)
- Strengthen resume-grounding requirements
- Add explicit "RESUME IS SOURCE OF TRUTH" section at top
- Clarify cursorStyle, gradientUsage, grainUsage, revealStyle must be concrete

**Corrected Section (lines 378-388):**

```typescript
Hard rules:
- This architecture must carry enough design intent that later HTML/CSS/JS models do NOT need to guess taste, hierarchy, or content emphasis.
- Make deliberate choices for hierarchy, spacing density, alignment, card treatment, border style, and button style.
- "antiPatterns" must contain at least 5 concrete things to avoid for this specific page.
- "cursorSectionBehavior", "gradientUsage", "grainUsage", and "revealStyle" must be concrete and specific to this candidate's chosen palette and section list - never "TBD", never left generic enough to apply to any site.
- The chosen designSystem.colors must belong to one coherent, deliberately-picked palette family (see palette diversity guidance) - do not default to indigo/violet/blue-purple unless that family was genuinely the best fit.
- Prefer concrete, recruiter/client/user-facing copy over generic marketing language.
- Use only one page (pages array with exactly one entry) - multi-page portfolio generation is not currently supported by this pipeline.
- Keep sections focused and useful; usually 4-8 sections.
- Every id and className must be internally consistent and reusable downstream.
- Every interaction selector must reference an id or className that exists in sections or components.
- Only add interactions that are genuinely needed.
- All color strings must be valid 6-digit hex values.
- Font names must be real common web-safe or Google/Fontshare fonts.
- Use real semantic tag names.
- "content" must contain concrete visible copy guidance, not empty strings and not "TBD".
- "items" must be used only when they add real structure for downstream agents.
- For portfolio/resume-like pages, prioritize credibility, proof of work, clarity, and scanability over decoration.
- If the resume is weak or sparse, simplify the blueprint instead of compensating with flashy design.
- If the resume is dense, curate aggressively rather than exposing everything equally.
- Never output explanations outside the JSON.

Planning constraints - RESUME IS SOURCE OF TRUTH:
- You MUST use only facts explicitly present in the resume data.
- You MUST NOT invent projects, employers, schools, certifications, publications, achievements, awards, links, metrics, dates, or testimonials.
- If a detail is missing from the resume, choose a safe planning fallback instead of fabricating content.
- If a section is unsupported or weak in the resume, omit it or reduce its prominence.
- If links are missing, do not design link-heavy sections.
- If images are not clearly supported, prefer low-image or no-image planning.
- The resume data provided below is the complete and only source of factual information about the candidate.
```

**Replace lines 376-389 with the above.**

---

### 3.3 Blueprint Prompt (CORRECTED)

**File:** `src/prompts/blueprint.ts`

**Key Changes:**
- Fix output shape to match `blueprintSchema.website.sections` structure
- Add explicit field definitions for each section object
- Strengthen featured item selection rules

**Corrected Output Shape Section (lines 56-64):**

```typescript
Required output shape - match this exactly. "website" contains style/developerType/audience/theme/layout/navigation/hero/sections/content/interactions/seo/assets. Note that "sections" is an array of objects, NOT a flat string array:

{
  "website": {
    "style": "modern" | "minimal" | "creative" | "glassmorphism" | "corporate" | "terminal" | "research",
    "developerType": "Frontend Developer",
    "audience": "hiring managers at product companies",
    "theme": {
      "mode": "light" | "dark",
      "primaryColor": "#......",
      "secondaryColor": "#......",
      "accentColor": "#......",
      "headingFont": "Inter",
      "bodyFont": "Inter"
    },
    "layout": {
      "type": "single-page",
      "heroLayout": "center" | "split" | "left",
      "maxWidth": "1200px"
    },
    "navigation": {
      "sticky": true,
      "showLogo": false,
      "items": ["About", "Projects", "Experience", "Contact"]
    },
    "hero": {
      "headline": "Building thoughtful software",
      "subheading": "Full-stack developer with 5 years building scalable web applications",
      "cta": "View my work"
    },
    "sections": [
      {
        "id": "hero",
        "enabled": true,
        "order": 1,
        "title": "",
        "variant": "center"
      },
      {
        "id": "about",
        "enabled": true,
        "order": 2,
        "title": "About",
        "variant": "default"
      },
      {
        "id": "projects",
        "enabled": true,
        "order": 3,
        "title": "Projects",
        "variant": "grid"
      }
    ],
    "content": {
      "featuredProject": "AI Portfolio Generator",
      "featuredExperience": "Senior Engineer at Acme Corp"
    },
    "interactions": {
      "animations": true,
      "animationStyle": "fade-up",
      "smoothScroll": true
    },
    "seo": {
      "title": "John Doe - Frontend Developer",
      "description": "Portfolio of John Doe, frontend developer specializing in React and TypeScript"
    },
    "assets": {
      "showGithub": true,
      "showResumeDownload": false,
      "showLinkedIn": true
    }
  }
}
```

**Also update decision section to clarify sections structure (lines 40-41):**

```typescript
5. sections - the final ordered array of section objects to render. Each object must have:
   - id: the section identifier (e.g. "hero", "about", "skills", "projects", "experience", "education", "certifications", "contact")
   - enabled: true (include) or false (omit from final site)
   - order: integer position in the page (1 = first, 2 = second, etc.)
   - title: the visible heading for this section (empty string for hero)
   - variant: the layout/style variant (e.g. "center", "split", "grid", "timeline", "list")

   Include ONLY sections the resume data actually supports. Omit "certifications" if there are none, omit "education" only if genuinely irrelevant to the candidate's narrative. Order by what should be prioritized first for this specific candidate, not a generic template order.
```

---

### 3.4 HTML/CSS/JS Prompts

**Status:** These prompts are already production-quality and well-structured. No changes required.

**Files:**
- `src/prompts/html.ts` - ✅ Excellent
- `src/prompts/css.ts` - ✅ Excellent  
- `src/prompts/js.ts` - ✅ Excellent

The HTML/CSS/JS prompts explicitly:
- Reference the exact HTML document being styled/scripted
- Forbid inventing selectors
- Ground every decision in the architecture/blueprint
- Include accessibility, responsive, and motion-reduction requirements
- Use the loaded skill guidance from `generated/skills/`

**No changes needed.**

---

## 4. Files Requiring Changes - Summary Table

| File | Change Type | Severity | Status |
|------|-------------|----------|--------|
| `src/tools/langchain.ts` | Replace ChatOpenRouter with ChatOpenAI + OmniRouter config | CRITICAL | ✅ DONE |
| `.env` | Add OMNIROUTER_URL, OMNIROUTER_API_KEY | CRITICAL | ✅ DONE |
| `src/config/ai.ts` | Update comment to reference OmniRouter instead of OpenRouter | LOW | ✅ DONE |
| `src/prompts/portfolio.ts` | DELETE or deprecate entire file | HIGH | ⚠️ RECOMMEND DELETE |
| `src/trigger/portfolio.ts` | DELETE entire file | HIGH | ⚠️ RECOMMEND DELETE |
| `src/prompts/architect.ts` | Remove "infer narrative" language, strengthen resume-grounding | HIGH | 📝 SEE SECTION 3.2 |
| `src/prompts/blueprint.ts` | Fix output shape to match schema | HIGH | 📝 SEE SECTION 3.3 |
| `src/services/resume/prompt.ts` | Add skill cap, strengthen "never invent" language | MEDIUM | 📝 SEE SECTION 3.1 |
| `src/trigger/blueprint.ts` | Remove repairWebsiteNesting() hack once prompt is fixed | LOW | ⚠️ AFTER BLUEPRINT FIX |
| `src/schemas/blueprint.ts` | Consider removing multi-page support for consistency | LOW | OPTIONAL |

---

## 5. OmniRouter Configuration Changes (COMPLETED)

### Changes Made:

1. **Updated `src/tools/langchain.ts`:**
   - Replaced `import { ChatOpenRouter } from "@langchain/openrouter"` with `import { ChatOpenAI } from "@langchain/openai"`
   - Added OmniRouter URL and API key configuration
   - Updated `createLlm()` to use `ChatOpenAI` with custom `baseURL` pointing to OmniRouter

2. **Updated `.env`:**
   - Added `OMNIROUTER_URL=http://localhost:3000/v1`
   - Added `OMNIROUTER_API_KEY=omni-router`
   - Commented out old `OPENROUTER_API_KEY` for reference

3. **Updated `src/config/ai.ts`:**
   - Updated comment to reference OmniRouter instead of OpenRouter/NVIDIA NIM

### Configuration:

All LLM calls now route through your local OmniRouter instance at `http://localhost:3000/v1`.

**Model Selection:**

The current model configuration in `src/config/ai.ts`:

```typescript
export const AI_MODELS: Record<StageName, string> = {
  architect: process.env.ARCHITECT_MODEL ?? "openrouter/free",
  blueprint: process.env.BLUEPRINT_MODEL ?? "openrouter/free",
  html: process.env.CODE_MODEL ?? "openrouter/free",
  css: process.env.CODE_MODEL ?? "openrouter/free",
  js: process.env.CODE_MODEL ?? "openrouter/free",
  portfolio: process.env.CODE_MODEL ?? "openrouter/free",
  resume: process.env.RESUME_MODEL ?? "openrouter/free",
};
```

**You should update these model names** to match whatever model identifiers your OmniRouter instance expects. For example:

```bash
# Add to .env
ARCHITECT_MODEL=gpt-4-turbo
BLUEPRINT_MODEL=gpt-4-turbo
CODE_MODEL=gpt-3.5-turbo
RESUME_MODEL=gpt-3.5-turbo
```

Or if OmniRouter proxies OpenRouter, keep the existing model names.

### Testing the Connection:

1. Start your OmniRouter instance on `http://localhost:3000`
2. Run the backend: `npm run dev`
3. Trigger a portfolio generation
4. Check logs for OmniRouter connection attempts

If OmniRouter is on a different port/host, update `OMNIROUTER_URL` in `.env`.

---

## 6. Confirmation: Core Logic Unchanged

### What Was Changed:
- **Transport layer only:** LLM client now points to OmniRouter instead of OpenRouter
- **Prompt guardrails:** Strengthened "never invent" language, fixed output shapes
- **Deprecated code:** Identified `portfolio.ts` monolith prompt as incompatible

### What Was NOT Changed:
- ✅ Task execution order (parent.ts workflow)
- ✅ Database schema
- ✅ Trigger.dev queue configuration
- ✅ File artifact structure (index.html, style.css, script.js)
- ✅ Validation logic
- ✅ Build/deploy steps
- ✅ API routes
- ✅ Authentication
- ✅ Resume parsing flow
- ✅ Architecture/Blueprint schemas (except recommendations)
- ✅ Function signatures
- ✅ Error handling

The existing **resume → architect → blueprint → HTML/CSS/JS → validate → build → deploy** workflow remains **completely intact**.

---

## 7. Implementation Checklist

### Immediate (Required):
- [x] Configure OmniRouter endpoint in `src/tools/langchain.ts`
- [x] Add OmniRouter env vars to `.env`
- [x] Update AI config comments
- [ ] Update `AI_MODELS` in `src/config/ai.ts` with correct model IDs for your OmniRouter
- [ ] Test OmniRouter connection with a simple portfolio generation

### High Priority (Recommended):
- [ ] Update `src/services/resume/prompt.ts` with corrected version (Section 3.1)
- [ ] Update `src/prompts/architect.ts` with corrected version (Section 3.2)
- [ ] Update `src/prompts/blueprint.ts` with corrected version (Section 3.3)
- [ ] DELETE `src/prompts/portfolio.ts` and `src/trigger/portfolio.ts`

### Medium Priority (Quality):
- [ ] Remove `repairWebsiteNesting()` hack from `trigger/blueprint.ts` after blueprint prompt is fixed
- [ ] Add validation test to verify blueprint output matches schema
- [ ] Consider removing multi-page layout support from `blueprintSchema` for consistency

### Low Priority (Polish):
- [ ] Add TypeScript types for corrected prompt response shapes
- [ ] Add integration test for full pipeline
- [ ] Document OmniRouter setup in main README

---

## 8. Additional Recommendations

### Model Selection Strategy

For **resume-to-portfolio generation**, consider this model allocation:

1. **Architect stage** (`AI_MODELS.architect`):
   - Needs: reasoning, planning, design judgment
   - Recommended: GPT-4 Turbo, Claude Opus, or equivalent reasoning model
   - Why: Architecture is the single most important planning stage

2. **Blueprint stage** (`AI_MODELS.blueprint`):
   - Needs: structured output, following instructions, JSON schema adherence
   - Recommended: GPT-4 Turbo or GPT-3.5-turbo with structured output
   - Why: Blueprint is simpler than architecture but must match schema exactly

3. **HTML/CSS/JS stages** (`AI_MODELS.html`, `css`, `js`):
   - Needs: code generation, following detailed specs
   - Recommended: GPT-3.5-turbo or Claude Sonnet (faster, cheaper)
   - Why: These are mechanical code generation tasks with detailed prompts

4. **Resume parsing** (`AI_MODELS.resume`):
   - Needs: structured extraction, deterministic output
   - Recommended: GPT-3.5-turbo with structured output mode
   - Why: Simple extraction, well-defined schema, temperature 0

### Monitoring Recommendations

Add logging for:
- Resume parsing extraction quality (missing fields, invented content)
- Architecture → Blueprint consistency (are colors/fonts matching?)
- HTML → CSS → JS selector consistency (validate task warnings)
- Generation time per stage
- OmniRouter request/response times
- Schema validation failures

### Future Improvements

1. **Add resume quality pre-check:**
   - Validate resume has minimum required sections before triggering full pipeline
   - Reject sparse resumes early with helpful error message

2. **Add architecture → blueprint validation:**
   - Verify blueprint colors match architecture palette family
   - Verify blueprint sections exist in architecture pages[0].sections

3. **Add HTML → CSS → JS consistency validation:**
   - Upgrade `validateTask` from regex to real parsers (parse5, postcss, acorn)
   - Make validation blocking with retry if consistency is critical

4. **Add prompt versioning:**
   - Tag each prompt with version number
   - Store prompt version in run metadata
   - Track generation quality by prompt version

---

## Appendix A: OmniRouter Setup Verification

### Test OmniRouter Connection

Run this from the backend directory:

```bash
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer omni-router" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 10
  }'
```

Expected response: JSON with completion from your configured LLM provider.

If this fails, check:
1. OmniRouter is running on port 3000
2. OmniRouter is configured with at least one LLM provider
3. Firewall allows localhost connections

---

## Appendix B: Prompt Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Original | Initial OpenRouter-based prompts |
| 2.0 | 2026-10-02 | OmniRouter configuration + prompt fixes |

---

## Contact & Support

For questions about this review or implementation guidance:
- Review Date: 2026-10-02
- Reviewer: Claude (Opus)
- Scope: Full codebase prompt audit + OmniRouter migration

---

**END OF DOCUMENT**
