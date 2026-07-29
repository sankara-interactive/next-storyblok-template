# Template Enhancement Roadmap

## Purpose

This document is the shared implementation plan for evolving the
sankara:interactive Next.js + Storyblok template. It is intended for humans and
coding agents. Keep statuses and architectural decisions current as work lands.

The sequencing principle is:

> Quality gates -> UI architecture -> primitives -> Storyblok adapters -> page sections.

Storyblok types must not leak into the reusable UI package. Storyblok components
adapt CMS data into stable UI component props.

## Status Legend

- `[ ]` Not started
- `[~]` In progress
- `[x]` Complete
- `[!]` Blocked or awaiting a decision

## Phase 0: Land the Baseline PR Stack

Status: `[~]` PR #11 verification and merge remaining

Land the existing work in dependency order:

```text
main
└── #9 hardening
    └── #10 Storyblok v7
        └── #11 core patterns
```

Tasks:

- [x] Merge PR #9, `feat/storyblok-patterns-hardening`.
- [x] Rebase or retarget PR #10, `chore/storyblok-react-v7-upgrade`, onto the
  merged baseline and merge it.
- [x] Rebase PR #11, `feat/template-core-patterns`, onto PR #10.
- [x] Resolve the rich-text implementation against the Storyblok v7 API.
- [~] Run tests, typecheck, lint, and a production build. Tests, typecheck, and
  lint pass locally; the production build remains outstanding.
- [ ] Merge PR #11.

Exit criteria:

- All three PRs are represented in `main` in the order above.
- Rich text, embedded bloks, preview editing, internal links, and email links
  have been smoke-tested.
- The working baseline passes all available quality checks.

## Phase 1: Baseline Reliability

Status: `[ ]`

Deliver as an independent PR before expanding the component catalogue.

Tasks:

- [ ] Add GitHub Actions for immutable install, typecheck, lint, tests, and build.
- [ ] Add `typecheck`, `format:check`, and combined `check` package scripts.
- [ ] Add server/client environment validation with production-safe failures.
- [ ] Return `null` only for real Storyblok 404 responses; surface unexpected
  authentication, network, rate-limit, and server failures.
- [ ] Make the production build reproducible in CI.
- [ ] Add generated Storyblok schema/type drift detection.
- [ ] Configure grouped dependency updates.

Exit criteria:

- Every PR runs the complete baseline check suite.
- Invalid production configuration fails early with a useful error.
- CMS outages do not silently appear as content 404s.

## Phase 2: UI Foundation Decision

Status: `[ ]`

Run a focused Base UI versus Radix spike. Base UI is the current preference, but
default styling is not a deciding factor.

Implement the same small sample with both foundations:

- Tabs
- Dialog
- Select or combobox
- Animated popover
- A server-rendered page containing client-side interaction

Evaluate:

- Accessibility and keyboard behavior
- API consistency and composability
- React Server Component boundaries
- Styling and animation ergonomics
- Bundle output
- Test ergonomics
- Form integration
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

## Phase 3: Sankara UI Foundation

Status: `[ ]`

Establish the reusable system before building a large component catalogue.
The provisional package name is `@sankara/ui`; confirm availability before
publishing.

Suggested structure:

```text
packages/ui/
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
- [ ] Establish package and registry release/versioning workflows.

Exit criteria:

- Components can be developed and tested independently of Storyblok.
- A consuming project can override brand tokens without forking component logic.
- Accessibility and API rules are enforceable, not only documented.

## Phase 4: First UI Component Release

Status: `[ ]`

Build in dependency order:

- [ ] Typography
- [ ] Container and layout primitives
- [ ] Button
- [ ] Icon button
- [ ] Link
- [ ] Field, label, help text, and error message
- [ ] Input and textarea
- [ ] Checkbox and radio
- [ ] Tabs
- [ ] Accordion
- [ ] Dialog
- [ ] Select

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

## Phase 5: Storyblok Adapter Layer

Status: `[ ]`

Keep Storyblok integration separate from `@sankara/ui`.

Suggested structure:

```text
packages/storyblok-ui/
├── adapters/
├── mappings/
├── schemas/
└── test/
```

Responsibilities:

- Translate generated Storyblok types into stable UI props.
- Apply `storyblokEditable` only at CMS boundaries.
- Handle incomplete editor content safely.
- Restrict editor-visible choices to semantic variants.
- Map Storyblok links, assets, focal points, and rich text.
- Provide useful preview placeholders without affecting live output.

Tasks:

- [ ] Add committed schemas and generated types for button, header, footer,
  navigation links, redirects, and site settings.
- [ ] Add button, tabs, accordion, form, asset, link, and rich-text adapters.
- [ ] Automate component registry generation from committed schemas.
- [ ] Add schema/type drift checks to CI.

Exit criteria:

- No reusable UI component imports Storyblok packages or generated CMS types.
- CMS adapters are typed, editor-safe, and covered by tests.

## Phase 6: Reusable Page Sections

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

## Phase 7: Integration Verification

Status: `[ ]`

Tasks:

- [ ] Add Playwright journey and responsive tests.
- [ ] Add automated axe accessibility checks.
- [ ] Add screenshot regression across supported viewports.
- [ ] Exercise draft entry/exit and visual-editor behavior.
- [ ] Cover metadata, sitemap, robots, redirects, and 404 behavior.
- [ ] Cover rich-text links and embedded bloks.
- [ ] Cover webhook revalidation behavior.

Exit criteria:

- Core authoring and visitor journeys are verified in a real browser.
- Accessibility and visual regressions are visible in CI.

## Phase 8: Project Bootstrap and Operations

Status: `[ ]`

Tasks:

- [ ] Define locale routing, Storyblok language selection, `hreflang`, and
  localized sitemap behavior.
- [ ] Add a `yarn setup` initializer for site identity, locale, Storyblok region,
  analytics, consent integration, environment configuration, and starter bloks.
- [ ] Add a private Sankara component registry if selected in Phase 2.
- [ ] Add security headers and a CSP compatible with preview and integrations.
- [ ] Add vendor-neutral logging and error-reporting hooks.
- [ ] Add release notes, semantic versioning, and template update automation.

Exit criteria:

- A new project can be configured without manual search-and-replace work.
- Operational and security defaults are production-ready and documented.

## Proposed PR Breakdown

| PR | Scope |
| --- | --- |
| A | CI and baseline reliability |
| B | UI foundation spike and architecture decision |
| C | `@sankara/ui` infrastructure and tokens |
| D | Native UI components and form foundations |
| E | Interactive components using the selected headless foundation |
| F | Storyblok schemas, generated types, and adapter layer |
| G | Starter section library |
| H | Playwright, accessibility, and visual tests |
| I | Setup CLI, localization, security, and operations |

## Maintenance Rules

- Update phase and task statuses in this document as work progresses.
- Add links to pull requests and architecture decisions when available.
- Do not skip dependency phases without recording why.
- Keep reusable UI APIs independent from Storyblok schemas.
- Prefer semantic editor options over arbitrary visual controls.
- Treat accessibility, responsive behavior, and reduced motion as acceptance
  criteria rather than later polish.
