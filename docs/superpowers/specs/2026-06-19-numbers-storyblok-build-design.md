# numbers.ch — Storyblok Build & Reusable Patterns — Design

**Date:** 2026-06-19
**Status:** Approved for planning

## 1. Context & Goals

numbers.ch is a new marketing website for partner **numbers**, a CH marketing /
lead-gen / ads agency (currently on Webflow, DE-only). The Figma is ready.

Two goals, deliberately separated:

1. **Ship numbers.ch** — a dead-fast, mostly-static content site. It must win on
   Core Web Vitals because traffic comes from paid ads (CWV feeds ad quality
   score and conversion).
2. **Establish reusable "how we build Storyblok sites" patterns** — content-type
   structure, blocks, preview, draft mode, revalidation, naming, tooling —
   packaged as `.claude/` skills/agent/hooks + `CLAUDE.md` **inside the
   template**, so every future site inherits them.

Site characteristics (from the partner): mostly static content, decorative JS
only (modals/animations), **no personalization**, forms handled by an external
tool, **DE-only** (stays single-language), few content updates expected.

## 2. Stack Decision

**Build on the existing `../next-storyblok-template`.** Astro was considered and
rejected.

- The template is current and fast-by-default: **Next 16 (App Router) · React 19
  · `@storyblok/react` 5 (RSC) · Tailwind 4 · TS strict · Yarn 4**, with
  **SSG + ISR** (`generateStaticParams` pre-renders every published route,
  `revalidate=3600`, webhook revalidation on publish) and exactly one
  `'use client'` boundary.
- Astro ships marginally less JS *by default*, but its only real edge —
  zero-JS — is achievable in this RSC template with discipline, and its one
  weakness (Visual Editor reloads the iframe per edit instead of live-swapping)
  is irrelevant here because WYSIWYG smoothness is not a requirement.
- **Deciding factors:** we already own a working, standardized Next+Storyblok
  template and want the reusable skills to live in it. Reuse + agency
  standardization beats greenfielding a leaner-on-paper stack. The effort saved
  by not rebuilding goes into performance hardening instead.

We would only revisit Astro if the template proved bloated *and* "absolute
fastest possible" were a hard non-negotiable over everything else. Neither holds.

## 3. Scope

| Layer | What | Where |
|---|---|---|
| **Instance** | numbers.ch site (pages, sections, content) | `numbers.ch` repo, cloned from template |
| **Base** | Template hardening + reusable conventions/tooling/skills | `../next-storyblok-template` |
| **Deferred** | Plugin packaging of the skills; full bidirectional schema sync | — |

numbers.ch is an *instance* of the template. Nothing numbers-specific flows back
into the template.

## 4. Architecture (template base, hardened)

### Rendering & routing
- **SSG + ISR.** `generateStaticParams()` pre-renders all published routes;
  `revalidate` per the preview/live split (below). Static HTML → near-zero TTFB
  for ad landing pages.
- Catch-all `app/[...slug]/page.tsx`. **The `data/` prefix is excluded from
  `generateStaticParams`** so global stories never become public pages.
- Draft/preview requests render dynamically.

### Data fetching
- Server-only Storyblok API module (`'server-only'` directive) so CMS fetching
  can never leak into a client bundle.
- `version: draft|published` selected by preview/live mode.

### Preview / draft mode
- Native `draftMode()` API via `/api/draft` + `/api/exit-draft` (already in
  template).
- A **MODE (preview vs live)** env gate controls: `revalidate` TTL, `noindex`
  robots meta in preview, and whether the Storyblok bridge loads.

### Revalidation
- **Standardize on the blunt-but-robust pattern** (ported from desinfecta):
  one global Storyblok cache tag, `revalidateTag(...)` flush-all on any publish.
  Avoids fragile slug→route mapping; correct for a low-update site. (Template
  currently does per-path `revalidatePath`; switch to tag-flush.)

### Performance hardening (the gap to close for ads)
1. **Gate the Storyblok bridge to preview/draft only.** Today
   `StoryblokProvider` loads the bridge unconditionally → ~50–100 KB of editor
   JS shipped to every ad visitor. Biggest single win.
2. **Self-host Gabarito via `next/font`** (no CLS, no external request).
3. **Storyblok image service**: AVIF/WebP + responsive `sizes`; `priority` only
   on the hero, lazy elsewhere.
4. Keep client JS to small islands (decorative animations/modals) only.

Target: demonstrably beat the current Webflow site on CWV.

## 5. Content Model

### Hierarchy: Page → Section → Component
- **Content type:** `page` (+ aliases like `landingPage`), trivial — renders a
  `body` of section bloks recursively via `StoryblokComponent`.
- **Sections** (`*Section`): map 1:1 from the Figma — `heroSection`,
  `clientsSection`, `frameworkSection`, `strategySection`, `performanceSection`,
  `teamSection`, `resourcesSection`, `faqSection`, plus footer/nav.
- **Leaf components** (`*Card` / `*Item`): `clientCard`, `faqItem`, `teamMember`,
  `resourceCard`, etc., used inside their section's `items` field.

### Globals: the `data/` folder
A non-routable top-level Storyblok folder holding global stories:
`menu`, `footer`, `redirects`, `teamMembers/` (collection), `locations/`,
`microcopy`.
- Excluded from routing (`generateStaticParams`), so never public pages.
- Bloks still carry registry entries + `storyblokEditable`, so editors edit them
  **in the Visual Editor (preview)** normally. "Invisible to routing, alive in
  preview."
- Replaces the old single "global" mega-story; scales to collections.

### Taxonomy: tags over folders
For grouping content (team members, resources, future blog), use Storyblok
**tags + `filter_query`/by-tag** rather than deep folders. Flat folders for
*routing*, tags for *grouping*.

## 6. Conventions (the reusable IP)

### Component registry discipline
All bloks map through a single registry. **Registry key = the exact camelCase
technical name.** Missing or mismatched key = **silent no-render** (no error).
This is the most common bug — documented prominently and checked by the reviewer
agent.

### Naming scheme
- **Storyblok technical names = camelCase, role-suffixed:** `heroSection`,
  `clientCard`, `faqItem`, content type `page`.
- **Code components = PascalCase, 1:1** with the technical name.
- Folders: `content_types/`, `nestables/sections/`, `nestables/components/`.
- The tag says *where a blok may go*; the name says *what it is*.

### Tag-based blok whitelisting (categorise, never enumerate)
Blocks fields restrict allowed components by **category**, never by listing each.
A shared set is always available.

| Tag (lowercase, role-based) | Meaning | Used by |
|---|---|---|
| `section` | page-level section bloks | `page.body` whitelist = `section` + `shared` |
| `shared` | universal utilities (`richText`, `button`, `image`, `spacer`, `embed`) | included in **every** whitelist |
| `richtext` | bloks embeddable inside rich text (`inlineCta`, `figure`, `gallery`) | rich-text embed whitelist = `richtext` + `shared` |
| `card` / `item` | reusable leaves (`clientCard`, `faqItem`) | their parent section's items field |

Verify at build time whether current Storyblok keys field-whitelisting off
"component groups" vs "tags"; use whichever is supported. The convention holds
either way.

### Field-name vocabulary (rules of thumb, not enforced)
Consistent field names let the generator infer the right JSX from name + type.

| Field name | Storyblok type | Renders as | Generator inference |
|---|---|---|---|
| `headline` | text **or** restricted richtext (bold + `&shy;`/nbsp only) | heading tag | inline heading renderer |
| `eyebrow` / `kicker` | text | small label above headline | inline text |
| `subline` | text / restricted richtext | subtitle | inline |
| `lead` | richtext (short) | intro/standfirst | RichTextRenderer |
| `text` | richtext (full) | body copy | RichTextRenderer |
| `body` | bloks (nestable) | section stream | `.map` → `StoryblokComponent` |
| `items` | bloks (repeating leaf) | cards/faq/etc. | `.map` → `StoryblokComponent` |
| `image` / `images` | asset(s) | `next/image` | image w/ Storyblok service |
| `media` | asset (img or video) | media block | type-switch render |
| `link` / `links` | link(s) | `<Link>` | link helper |
| `label` | text | button/tag text | plain string |
| `variant` / `theme` / `alignment` / `layout` | option / datasource | — | className map |
| `is*` / `has*` / `show*` | boolean | — | conditional |

## 7. Tooling & Schema Workflow

### Combined sync task
One `yarn sync` that: pulls `components.json` → generates TS types
(`{Name}Storyblok` discriminated unions) → scaffolds missing component stubs via
`generators/cli.js`. Types always in lockstep with the schema. (Template
currently splits `pull-components` and `generate-types`.)

### Schema-as-code, fitted to a mixed team
The team edits schemas in three ways: the user authors in code; Oli edits
schemas in the Storyblok UI; Anja builds bloks in the UI that get pulled and
adjusted in code. True bidirectional sync would clobber UI work and is
fragile — **do not build it.** Instead:

- **Storyblok UI is the source of truth for schemas.**
- **Pull is primary.** `components.json` is **committed to git**, so every pull
  is a *reviewable diff* of what changed in the UI. This diff is the main win
  and is free (it's the pull artifact).
- **Push is a manual escape hatch**, not an engine: `storyblok push-components`
  (or a thin Management-API script) pushes a single blok back when the user
  authors it in code. It overwrites, so it's deliberate and coordinated, guarded
  by the git diff. Verify exact CLI command at build time.
- Skip auto bidi sync; the committed JSON + a per-blok ownership note replaces
  it.

### Agents ↔ Storyblok via the Management API
For agent-driven schema/content work (create/update component schemas, seed the
`data/` folder, datasources, redirects), use the **Storyblok Management API**
(OAuth token + space ID), **not the Storyblok MCP** — the Management API is more
reliable and capable.

### `.claude/` assets to port (trimmed for numbers)
Port from `../frontend-desinfecta` into the **template**, dropping what numbers
doesn't need (i18n/next-intl, multi-step forms, email relay, PLZ maps,
self-hosted pipeline):
- **Skill** `new-storyblok-component` — scaffolds all wiring steps (file, barrel
  export, registry key, type, editable wrapper).
- **Agent** `storyblok-component-reviewer` — checklists a new blok against the
  conventions above.
- **Hooks** (`settings.json`) — block `.env*` edits, block direct commits to
  `main`.
- **`CLAUDE.md`** — documents: registry discipline, Page→Section→Component
  naming, tag-based whitelisting, field-name vocabulary, `data/` globals,
  preview/revalidate model, perf rules.

## 8. Plugin — Deferred

Skills are plain files living in the template; every clone inherits them.
Promote to a distributable plugin only once maintaining the same skills across
multiple repos actually hurts. No distribution infra built speculatively.

## 9. Verify-at-build Items
- Exact Storyblok field-whitelisting mechanism (component groups vs tags) in the
  current Storyblok version.
- Exact CLI command for pushing component schemas (`storyblok push-components`
  vs Management-API script).
- Whether the template's `generators/cli.js` already handles the
  `nestables/sections` vs `nestables/components` split, or needs a tweak.

## 10. Out of Scope (YAGNI)
- i18n / multi-language (DE-only).
- On-site forms (external tool) and email relay.
- Authentication / personalization / per-request rendering.
- Full bidirectional schema sync.
- Plugin packaging (deferred).
