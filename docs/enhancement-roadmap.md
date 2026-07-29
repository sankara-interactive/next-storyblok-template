# Template Enhancement Roadmap

## Purpose

This document is the shared implementation plan for evolving the
sankara:interactive Next.js + Storyblok template. It is intended for humans and
coding agents. Keep statuses and architectural decisions current as work lands.

After the shared foundation, work splits into two tracks that run in parallel:

> **Track A** (this repo): Storyblok plumbing — routing, caching, adapters, sections.
> **Track B** (`@sankara/ui` repo): the reusable UI system, built without Storyblok.

They join at Phase A3, where adapters translate CMS data into UI props. Until
then neither track blocks the other.

Storyblok types must not leak into the reusable UI package. Storyblok components
adapt CMS data into stable UI component props.

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked or awaiting a decision

## Decisions

Record architectural decisions here as they are made, newest last.

- **`@sankara/ui` lives in its own repository**, not as `packages/ui/` in this
  template. This template consumes it as a published dependency. Rationale: a
  template is cloned per project, and shipping the design-system source into
  every clone is backwards; the "a consuming project can override brand tokens
  without forking component logic" criterion is only tested honestly when the
  consumer is external; and a workspace conversion would restructure this repo's
  root, colliding with every open branch. Confirm the npm scope before publishing.

## Phase 0: Land the Baseline PR Stack

Status: `[~]` All PRs merged; manual smoke-testing remains

Tasks:

- [x] Merge PR #9, `feat/storyblok-patterns-hardening`.
- [x] Rebase or retarget PR #10, `chore/storyblok-react-v7-upgrade`, onto the
  merged baseline and merge it.
- [x] Rebase PR #11, `feat/template-core-patterns`, onto PR #10.
- [x] Resolve the rich-text implementation against the Storyblok v7 API.
- [x] Run tests, typecheck, lint, and a production build. The production build is
  covered by the CI job added in Phase 1.
- [x] Merge PR #11.
- [ ] Smoke-test rich text, embedded bloks, preview editing, internal links, and
  email links against a real space.

Exit criteria:

- All three PRs are represented in `main`.
- The manual smoke test above has actually been run — everything below assumes
  this baseline works.

## Phase 1: Baseline Reliability

Status: `[~]` Implemented in PR #13, `feat/template-ci-foundation`; awaiting review

Tasks:

- [x] Add GitHub Actions for immutable install, typecheck, lint, tests, and build.
- [x] Add `typecheck`, `format:check`, and combined `check` package scripts.
- [x] Add server/client environment validation with production-safe failures.
- [x] Return `null` only for real Storyblok 404 responses; surface unexpected
  authentication, network, rate-limit, and server failures.
- [x] Make the production build reproducible in CI.
- [x] Add generated Storyblok schema/type drift detection.
- [x] Configure grouped dependency updates.

Exit criteria:

- Every PR runs the complete baseline check suite.
- Invalid production configuration fails early with a useful error.
- CMS outages do not silently appear as content 404s.

---

# Track A — Template

## Phase A1: Cleanup and Backports

Status: `[ ]` Blocked on PR #13 merging (overlapping files)

Findings from the numbers.ch backport audit and the repo over-engineering audit.
One PR; all mechanical.

Tasks:

- [ ] Fix per-page `openGraph` silently replacing the root layout's. Next does
  not deep-merge that key, so `og:site_name`, `og:locale` and `og:type` are
  missing on every content route. Export the defaults once from `lib/config.ts`
  and spread into both; correct the now-false OG claim in `CLAUDE.md`.
- [ ] Delete `lib/storyblok-image.ts` and its test — no callers outside the test.
- [ ] Drop the unused `clsx` dependency.
- [ ] Remove the four inert restated ignores in `eslint.config.mjs`
  (`eslint-config-next` already applies them).
- [ ] Replace `app/page.tsx` with an optional catch-all (`app/[[...slug]]`),
  removing the duplicated `revalidate` export.
- [ ] Shrink `sitemapPaths` to filter/map; collapse the identical `url`/`asset`
  branches in `getHref`.

Exit criteria:

- No dead exports, no unused dependencies, no inert configuration.
- Open Graph defaults actually reach content routes.

## Phase A2: CMS-Editable Redirects

Status: `[!]` Awaiting a decision on the matching strategy

Client requirement: editors change redirects in Storyblok and cannot trigger a
redeploy. Today `lib/redirects.mjs` feeds `next.config.mjs` at build time only.

Do **not** port the numbers.ch implementation as-is. Its matcher compares
`source === pathname` (so `:slug*` patterns silently fail), skips any path
containing a dot (so `/impressum.html` never redirects), drops the query string,
and derives the redirect origin from the Host header.

Two candidate designs — pick one before writing code:

1. **Resolve at the 404 boundary.** `getStory` already returns `null` before
   `notFound()` in the catch-all; look up the redirect list there and `redirect()`.
   No per-request proxy, no self-fetch, reads go through `lib/storyblok-api.ts`
   with existing cache tags. Costs nothing on hits. Does not fire for a source
   path that still resolves to a live story, and covers only paths reaching the
   catch-all.
2. **Resolve in `proxy.ts`.** Catches every path including live ones, at the cost
   of work on every request and a cache-read path that must work outside the
   normal RSC context.

Tasks:

- [ ] Decide between (1) and (2) and record it under Decisions.
- [ ] Define the `data/redirects` schema (source, destination, permanent).
- [ ] Implement, preserving query strings and never trusting the Host header.
- [ ] Keep developer-authored pattern redirects in `next.config.mjs`; the CMS
  story is for exact-path retirement.
- [ ] Test: exact match, no match, query preservation, permanent vs temporary.

Exit criteria:

- An editor can retire a URL and see the redirect live without a deploy.
- Pattern redirects still work.

## Phase A3: Storyblok Adapter Layer

Status: `[ ]` Joins Track B — needs B3

Keep Storyblok integration separate from `@sankara/ui`.

Responsibilities:

- Translate generated Storyblok types into stable UI props.
- Apply `storyblokEditable` only at CMS boundaries.
- Handle incomplete editor content safely.
- Restrict editor-visible choices to semantic variants.
- Map Storyblok links, assets, focal points, and rich text.
- Provide useful preview placeholders without affecting live output.

Tasks:

- [ ] Add committed schemas and generated types for button, header, footer,
  navigation links, and site settings.
- [ ] Add button, accordion, form, asset, link, and rich-text adapters.
- [ ] Automate component registry generation from committed schemas.

Exit criteria:

- No reusable UI component imports Storyblok packages or generated CMS types.
- CMS adapters are typed, editor-safe, and covered by tests.

## Phase A4: Reusable Page Sections

Status: `[ ]`

Build sections from the shared UI and adapter layers:

- [ ] Hero
- [ ] Rich-text section
- [ ] Image/text section
- [ ] Card and card grid
- [ ] CTA/banner
- [ ] FAQ
- [ ] Testimonials or quotes
- [ ] Logo list
- [ ] Media/video
- [ ] Contact form

Exit criteria:

- Sections reuse the established typography, spacing, controls, and interaction
  components rather than introducing local alternatives.
- Storyblok child restrictions and semantic variants are encoded in schemas.

## Phase A5: Integration Verification

Status: `[ ]`

Tasks:

- [ ] Add Playwright journey and responsive tests.
- [ ] Add automated axe accessibility checks.
- [ ] Add screenshot regression across supported viewports.
- [ ] Exercise draft entry/exit and visual-editor behavior.
- [ ] Cover metadata, sitemap, robots, redirects, and 404 behavior.
- [ ] Cover rich-text links and embedded bloks.
- [ ] Cover webhook revalidation behavior, including the route handler itself —
  currently only its helpers are tested.

Exit criteria:

- Core authoring and visitor journeys are verified in a real browser.
- Accessibility and visual regressions are visible in CI.

## Phase A6: Project Bootstrap and Operations

Status: `[ ]`

Tasks:

- [ ] Define locale routing, Storyblok language selection, `hreflang`, and
  localized sitemap behavior.
- [ ] Add a `yarn setup` initializer for site identity, locale, Storyblok region,
  analytics, consent integration, environment configuration, and starter bloks.
- [ ] Add security headers and a CSP compatible with preview and integrations.
- [ ] Add vendor-neutral logging and error-reporting hooks.
- [ ] Add release notes, semantic versioning, and template update automation.
- [ ] Declare `storyblok-js-client` explicitly — three files import it while
  relying on it staying a transitive dependency of `@storyblok/react`.

Exit criteria:

- A new project can be configured without manual search-and-replace work.
- Operational and security defaults are production-ready and documented.

---

# Track B — `@sankara/ui`

Runs in its own repository. Nothing here depends on Track A until Phase A3.

## Phase B1: UI Foundation Decision

Status: `[ ]`

Run a focused Base UI versus Radix spike. Base UI is the current preference, but
default styling is not a deciding factor.

Build the same sample with both foundations. Use components that **already exist**
in `numbers.ch/components/ui/` rather than an abstract Tabs/Dialog/Select set —
their interaction requirements are known, which makes the comparison concrete:

- `Expandable` (disclosure, animated height)
- `CardSlider` (keyboard and pointer dragging, snap)
- `Gallery` (overlay, focus trap, escape handling)
- `Reveal` (scroll-triggered motion, reduced-motion behavior)
- A server-rendered page containing client-side interaction

Evaluate:

- Accessibility and keyboard behavior
- API consistency and composability
- React Server Component boundaries
- Styling and animation ergonomics
- Bundle output
- Test ergonomics
- Portals and Content Security Policy compatibility
- Upgrade and maintenance model

Tasks:

- [ ] Build and measure the Base UI sample.
- [ ] Build and measure the Radix sample.
- [ ] Record the decision in `docs/architecture/001-ui-foundation.md`.
- [ ] Decide whether distribution uses a package, a private shadcn-compatible
  registry, or both.

Exit criteria:

- The chosen foundation and rejected alternatives are documented with evidence.
- The expected server/client boundary and dependency policy are explicit.

## Phase B2: Foundation and Infrastructure

Status: `[ ]`

Establish the system before building a catalogue.

Structure:

```text
src/
├── components/
├── hooks/
├── styles/
├── test/
├── tokens/
└── utilities/
```

Tasks:

- [ ] Define semantic color, typography, spacing, radius, border, shadow,
  motion, breakpoint, focus, and layering tokens.
- [ ] Define theming and customer-brand override rules.
- [ ] Document naming, composition, variants, refs, controlled state,
  `className` escape hatches, and server/client boundaries.
- [ ] Establish reduced-motion and accessibility acceptance policies.
- [ ] Add Storybook or an equivalent isolated component workbench.
- [ ] Add unit, accessibility, and visual-regression test infrastructure.
- [ ] Establish package release and versioning workflows.

Exit criteria:

- Components can be developed and tested independently of Storyblok.
- A consuming project can override brand tokens without forking component logic.
- Accessibility and API rules are enforceable, not only documented.

## Phase B3: First Component Release

Status: `[ ]`

The catalogue is derived from what a real site actually needed. Across
`numbers.ch`'s 65 components, `components/ui/` grew to: `BgMark`, `CardSlider`,
`CountUp`, `Expandable`, `Gallery`, `Glow`, `Icon`, `IconBox`, `Pill`, `Reveal`.
Its only form is a nestable with raw inputs — no Field, Input, Select, Dialog or
Checkbox primitive was ever extracted. Build what demand exists, not a generic
design system.

**Tier 1 — extract from numbers.ch, proven by use:**

- [ ] Icon (plus icon-data generation)
- [ ] Reveal (scroll-triggered motion)
- [ ] Expandable (disclosure/accordion)
- [ ] CardSlider
- [ ] Gallery
- [ ] CountUp
- [ ] Pill, IconBox
- [ ] Glow, BgMark (decorative)

**Tier 2 — needed by every site, not yet extracted anywhere:**

- [ ] Typography
- [ ] Container and layout primitives
- [ ] Button and Link (shared variant surface)
- [ ] Field, label, help text, error message
- [ ] Input and textarea

**Deferred until a project actually needs them:** Dialog, Select, Tabs,
Checkbox and radio. Revisit at the first real requirement; do not build on spec.

Each component must include:

- A typed, documented API
- Keyboard and accessibility coverage
- Story/workbench examples
- Visual regression states
- Loading, disabled, error, and empty states where applicable
- Responsive verification
- An explicit server or client component boundary

Exit criteria:

- The first release is usable without Storyblok.
- Components share consistent composition, styling, focus, and state patterns.

---

## Maintenance Rules

- Update phase and task statuses in this document as work progresses.
- Record architectural decisions under Decisions, with the rationale.
- Add links to pull requests and architecture decisions when available.
- Do not skip dependency phases without recording why.
- Keep reusable UI APIs independent from Storyblok schemas.
- Prefer semantic editor options over arbitrary visual controls.
- Treat accessibility, responsive behavior, and reduced motion as acceptance
  criteria rather than later polish.
- Before adding a component or phase, check whether a shipped project already
  needed it. Evidence beats specification.
