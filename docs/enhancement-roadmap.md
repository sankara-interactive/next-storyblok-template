# Template Enhancement Roadmap

## Purpose

This document is the shared implementation plan for evolving the
sankara:interactive Next.js + Storyblok template. It is intended for humans and
coding agents. Keep statuses and architectural decisions current as work lands.

After the shared foundation, work splits into two tracks that run in parallel:

> **Track A** (this repo): Storyblok plumbing — routing, caching, adapters, sections.
> **Track B** (`@sankara-ui/core` repo): the reusable UI system, built without Storyblok.

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

- **Track B decisions are recorded in
  `docs/superpowers/specs/2026-07-29-sankara-ui-design.md`**: Base UI as the
  headless foundation, a versioned package on public npm, and Tailwind v4
  classes against a documented `@theme` token contract.
- **`@sankara-ui/core` lives in its own repository**, not as `packages/ui/` in this
  template. This template consumes it as a published dependency. Rationale: a
  template is cloned per project, and shipping the design-system source into
  every clone is backwards; the "a consuming project can override brand tokens
  without forking component logic" criterion is only tested honestly when the
  consumer is external; and a workspace conversion would restructure this repo's
  root, colliding with every open branch.
- **The package is `@sankara-ui/core` under the `sankara-ui` npm org** (decided
  2026-07-30). `@sankara` and `@sankara-interactive` were both taken. The second
  segment avoids stuttering as `@sankara-ui/ui` and leaves room for
  `@sankara-ui/storyblok` when Phase A3's adapter layer becomes a package.
- **CMS redirects resolve at the 404 boundary, not in `proxy.ts`** (decided
  2026-07-30). The requirement is exact-path *retirement*, and a retired URL is
  by definition the 404 case, so the proxy's one real advantage — redirecting a
  path that still resolves to a live story — buys nothing here. It would cost a
  lookup on every request plus a Storyblok read outside the RSC context, which
  means either a per-request fetch or a second cache that the revalidation
  webhook cannot flush; both break the invariant that every read is tagged.
  The trade-off accepted: an editor must unpublish the old story before its
  redirect fires. Pattern redirects stay developer-owned in `next.config.mjs`.

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

Status: `[x]` Merged in PR #13, `feat/template-ci-foundation`

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

Status: `[x]` Complete

Findings from the numbers.ch backport audit and the repo over-engineering audit.
One PR; all mechanical.

Tasks:

- [x] Fix per-page `openGraph` silently replacing the root layout's. Next does
  not deep-merge that key, so `og:site_name`, `og:locale` and `og:type` are
  missing on every content route. Export the defaults once from `lib/config.ts`
  and spread into both; correct the now-false OG claim in `CLAUDE.md`.
- [x] Delete `lib/storyblok-image.ts` and its test — no callers outside the test.
- [x] Drop the unused `clsx` dependency.
- [x] Remove the four inert restated ignores in `eslint.config.mjs`
  (`eslint-config-next` already applies them).
- [x] Replace `app/page.tsx` with an optional catch-all (`app/[[...slug]]`),
  removing the duplicated `revalidate` export.
- [x] Shrink `sitemapPaths` to filter/map; collapse the identical `url`/`asset`
  branches in `getHref`.

Exit criteria:

- No dead exports, no unused dependencies, no inert configuration.
- Open Graph defaults actually reach content routes.

## Phase A2: CMS-Editable Redirects

Status: `[~]` Code complete; blocked on the Storyblok schema existing

Client requirement: editors change redirects in Storyblok and cannot trigger a
redeploy. Resolved at the 404 boundary — see Decisions. The old build-time path
(`lib/redirects.mjs` feeding `next.config.mjs`) is gone: a baked copy would keep
serving a stale destination after an editor changed it, which is the exact thing
the requirement rules out.

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

- [x] Decide between (1) and (2) and record it under Decisions.
- [x] Define the `data/redirects` schema (source, destination, permanent) —
  documented in `README.md`.
- [ ] Create the `redirect` blok and `redirects` content type in the Storyblok
  space, then `yarn sync`. Needs `STORYBLOK_OAUTH_TOKEN`, which is not set
  locally; until this lands `getRedirects()` reads a story that does not exist
  and returns `[]`, so nothing redirects.
- [x] Implement, preserving query strings and never trusting the Host header.
  Destinations come from the CMS as a path or absolute URL, so no origin is
  ever derived from a request header.
- [x] Keep developer-authored pattern redirects in `next.config.mjs`; the CMS
  story is for exact-path retirement.
- [x] Test: exact match, no match, prefix non-match, dotted paths, trailing
  slashes, query preservation, permanent vs temporary.

Exit criteria:

- An editor can retire a URL and see the redirect live without a deploy.
- Pattern redirects still work.

## Phase A3: Storyblok Adapter Layer

Status: `[ ]` Joins Track B — needs B3

Keep Storyblok integration separate from `@sankara-ui/core`.

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

# Track B — `@sankara-ui/core`

Runs in its own repository. Nothing here depends on Track A until Phase A3.

## Phase B1: UI Foundation Decision

Status: `[x]` Decided — see `docs/superpowers/specs/2026-07-29-sankara-ui-design.md`

The planned Base UI versus Radix spike was dropped. It was scoped against
`Expandable`, `CardSlider`, `Gallery` and `Reveal`, and three of those four have
no counterpart in either library — Base UI's `Slider` is a range input and its
`ScrollArea` is a custom-scrollbar container, so neither library ships a
carousel. The spike would have compared them where they do not compete.

(An earlier revision of this document described `Gallery` as an overlay with a
focus trap. That was wrong: it is a 50-line scroll-snap slider with dot
pagination, structurally the same component as `CardSlider`.)

Decisions taken:

- [x] Base UI as the headless foundation, used only where a component needs it.
  No incumbent exists to standardise on — fgpfister.ch runs Radix,
  fairmed.ch-sb runs Headless UI — so any choice migrates something.
- [x] Distribution is a versioned package on public npm, not a copy-in registry.
- [x] Styling ships as Tailwind v4 classes against a documented `@theme` token
  contract.

## Phase B2: Foundation and Infrastructure

Status: `[ ]`

Establish the system before building a catalogue.

Structure:

```text
src/
├── components/
├── hooks/
├── styles/     token contract + base layer
├── test/
└── utilities/
```

No separate `tokens/` directory: Tailwind v4's `@theme` is the token system, so
the contract is CSS, not a build step.

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

The catalogue is derived from five shipped projects — numbers.ch, fgpfister.ch,
fairmed.ch-sb, nuwa.swiss and brillen-werk.ch — not from a generic design-system
checklist. An earlier revision derived it from numbers.ch alone and got it
substantially wrong; see the design spec for the survey.

**Tier 1 — present in every project:**

- [ ] Icon — FontAwesome in four of five; numbers.ch's hand-written
  `icon-data.ts` is a reimplementation of it. Wrap FontAwesome, don't ship icon
  data.
- [ ] Carousel — every project has one. Build-or-wrap is open: three hand-rolled
  scroll-snap, two use Splide. No headless library ships one.

**Tier 2 — present in two or more:**

- [ ] Disclosure (numbers.ch `Expandable`, fgpfister `ExpandableTableRows` and
  `ShowMore`), on Base UI Collapsible/Accordion
- [ ] Field, Input, Textarea, Checkbox, RadioGroup, Select
- [ ] Dialog, Popover, Menu — the highest-frequency primitives in the survey

**Tier 3 — universal, lower risk:**

- [ ] Typography, Container
- [ ] Button and Link (shared variant surface)
- [ ] Pagination, Breadcrumbs, mobile navigation, LanguageSwitcher, ShareBar,
  VideoPlayer

**Out of the first release:** `Reveal`, `CountUp`, `Glow`, `BgMark`, `Pill`,
`IconBox`. Each appears only in numbers.ch — that site's visual language, not a
shared system. Revisit when a second project needs one.

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
