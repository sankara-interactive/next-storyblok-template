# `@sankara-ui/core` — Design

Date: 2026-07-29
Status: approved, ready for implementation planning
Scope: Track B phases B1 and B2 of `docs/enhancement-roadmap.md`

## Problem

Every sankara:interactive client site re-implements the same interactive
components. Three shipped projects were surveyed and each had grown its own
carousel, its own disclosure widget, and its own form inputs. Fixes never
propagate; patterns drift; a new site starts from a copy of whichever previous
site was closest.

`@sankara-ui/core` is the shared layer. It is not a general-purpose design system —
it holds what our projects have repeatedly needed, and nothing else.

## Evidence base

The catalogue below is derived from five shipped projects, not from a generic
design-system checklist.

| Project | Components | UI layer | Headless library | Carousel | Icons |
| --- | --- | --- | --- | --- | --- |
| numbers.ch | 65 `.tsx` | `components/ui/`, 760 lines (255 of it `icon-data.ts`) | none | hand-rolled | own `fa-*` data |
| fgpfister.ch | 89 `.tsx` | `components/partials/` | `radix-ui` (6 import sites) | hand-rolled | FontAwesome |
| fairmed.ch-sb | 112 `.tsx` | `components/forms/`, `components/layout/` | `@headlessui/react` (8), `@radix-ui/react-slider` (1) | Splide | FontAwesome |
| nuwa.swiss | 15 `.tsx`/`.js` | `components/helpers/`, `components/layout/` | `@headlessui/react` | Splide | FontAwesome Pro |
| brillen-werk.ch | 36 `.tsx` | `components/helpers/`, `components/layout/` | `@radix-ui/react-dialog` | hand-rolled | FontAwesome kit |

nuwa.swiss is Pages Router and largely `.js`; treat its evidence as weaker for an
App Router package.

Headless libraries split evenly — Radix in fgpfister.ch and brillen-werk.ch,
Headless UI in fairmed.ch-sb and nuwa.swiss — so there is no incumbent.

Headless primitives referenced across fgpfister.ch and fairmed.ch-sb, by
identifier frequency — indicative of relative demand, not exact call counts:

Popover 25, Dialog 21, Checkbox 16, RadioGroup 13, Menu 11, Listbox 11,
Slider 8, Select 2, Accordion 2.

Two conclusions follow, both of which overturned earlier assumptions:

1. **Dialog, Popover, Checkbox, RadioGroup and Menu are the most-used
   primitives**, not unused ones. The roadmap previously deferred several of
   them on the strength of a single project that happened not to need them.
2. **Carousel and Icon are the only patterns present in every project.** No
   headless library ships a carousel, and FontAwesome already covers icons in
   four of the five.

## Decisions

### D1 — Own repository, published to public npm

`sankara-interactive/sankara-ui`, published as `@sankara-ui/core`.

A template is cloned per project, so shipping design-system source into every
clone is backwards, and the "consumers override brand tokens without forking
component logic" requirement is only tested honestly when the consumer is
external. Public npm avoids an `.npmrc` token dance repeated across 7+ consumer
repos and their CI, and a Tailwind component library contains no secrets.

### D2 — Versioned package, not a copy-in registry

Consumers pin a semver version. This is the only distribution model where one
bug fix reaches every site without touching each repo, which is the entire
justification for the package existing. The cost is accepted: brand-specific
values must be parameterised up front, and breaking changes need migration
discipline.

### D3 — Base UI as the headless foundation

**Retired 2026-08-05.** Seven components have shipped through `@sankara-ui/core`
0.6.0 (Icon, Carousel, Disclosure, Dialog, Popover, Button, RichText, Heading)
and none consumes Base UI — the package has zero runtime dependencies; every
interactive behaviour landed on a native platform feature instead (`<details
name>`, `<dialog>`/`showModal()`, the Popover API with CSS anchor positioning,
scroll-snap). Base UI remains a candidate for a future component that actually
needs headless machinery (Menu, Listbox, form primitives), but it is no longer
a standing foundation decision. Original rationale kept below for the record.

Adopted by decision rather than by spike.

The originally planned Base UI vs Radix spike was scoped against `Expandable`,
`CardSlider`, `Gallery` and `Reveal`. Verified against Base UI v1.6's export
map, three of those four have no counterpart in either library — Base UI's
`Slider` is a range input and `ScrollArea` is a custom-scrollbar container,
neither is a carousel. The spike would have compared two libraries on terrain
where neither competes.

There is also no incumbent to standardise on: fgpfister.ch runs Radix,
fairmed.ch-sb runs Headless UI. Any choice migrates something. Base UI comes
from the Radix, Floating UI and Material UI teams and its 40+ components cover
every primitive the survey found.

Base UI is used **only where a component needs it**. `Carousel`, `Reveal` and
`CountUp` use nothing.

Consequence accepted: three headless libraries coexist across the estate until
old sites migrate, which may be never.

### D4 — Tailwind v4 classes plus a documented token contract

Components ship Tailwind utility classes. Consumers add one line to their CSS:

```css
@import "tailwindcss";
@source "../node_modules/@sankara-ui/core";
```

Tailwind v4 excludes `node_modules` from scanning by default; `@source` is the
documented way to opt a package back in.

Brand values are `@theme` variables. Tailwind v4's `@theme` **is** the token
system, so no separate token pipeline is built. Every token the package reads
is documented and carries a fallback, so an unconfigured consumer renders
something plain rather than broken.

This is the extraction work: numbers.ch's `borderRadius: 18`,
`rgba(115,66,241,0.4)` and `px-[22px]` become `--radius-card`,
`--shadow-raised` and spacing tokens.

Every component accepts `className`, merged last so the consumer always wins.

## Architecture

### Package shape

```text
src/
├── components/     one component per file, one purpose
├── hooks/
├── styles/         token contract + any base layer
├── test/
└── utilities/
```

Peer dependencies: `react`, `react-dom`, `tailwindcss` v4, and the two free
FontAwesome runtime packages.

`next` is **not** a peer dependency of the first release. Implementation planning
established that `Carousel` takes children, so consumers pass their own
`next/image` elements in and nothing in the package imports a Next surface. The
peer gets added by the release that introduces an image-bearing component —
declaring it earlier would make every consumer satisfy a dependency the package
never loads. When that happens the coupling is accepted rather than abstracted:
every consumer is a Next site.

### Client boundaries

`'use client'` goes only on components that need interactivity. Five of
numbers.ch's ten UI components are server components today, and that must
survive extraction — a blanket `'use client'` at the package root would silently
push every consumer's tree client-side.

### Prohibited dependencies

No Storyblok packages, no generated CMS types, no data fetching. `next/image`
and `next/link` are the only Next surfaces used. CMS adaptation is Track A's
job (roadmap phase A3).

## First release scope

Ordered by demonstrated demand.

**Tier 1 — present in every project**

- `Icon` — FontAwesome is used in four of five projects. numbers.ch is the
  outlier only because it hand-wrote 255 lines of `icon-data.ts` keyed on
  `fa-*` names, which is a reimplementation of FontAwesome rather than an
  alternative. The package wraps FontAwesome behind a stable
  `<Icon icon={…} label={…} />` API taking an `IconDefinition`;
  numbers.ch's `icon-data.ts` is deleted on migration, not extracted.
- `Carousel` — every project has one. Must cover numbers.ch's `CardSlider` and
  `Gallery` (the same scroll-snap mechanism written twice), fgpfister's
  `SuccessStoriesSlider`, and fairmed's `SliderHeader`, `ImpactSlider` and
  `ProjectCountriesSlider`.

  **Open: build or wrap.** Three projects hand-rolled roughly 60 lines of
  scroll-snap; two pay for `@splidejs/react-splide`. Wrapping adds a dependency
  for three of five consumers; hand-rolling means owning keyboard and
  screen-reader behaviour that the existing hand-rolled versions do not have.
  Resolve with a short spike during implementation planning, measuring both
  against the five real usages above — not in the abstract.

**Tier 2 — present in two or more of the five**

- `Disclosure` — numbers.ch `Expandable`, fgpfister `ExpandableTableRows` and
  `ShowMore`. Built on Base UI Collapsible/Accordion, which supplies the
  `aria-controls` and id wiring every hand-rolled version is missing.
- Form primitives: `Field`, `Input`, `Textarea`, `Checkbox`, `RadioGroup`,
  `Select` — fairmed has dedicated `Checkbox`, `RadioGroup`, `TextField` and
  `FilterSelect`; numbers.ch's contact form uses raw inputs.
- `Dialog`, `Popover`, `Menu` — the highest-frequency primitives in the survey.

**Tier 3 — universal but lower risk**

- `Typography`, `Container`, `Button`, `Link` — needed by every site, not yet
  extracted anywhere.
- Navigation and layout: `Pagination`, `Breadcrumbs`, mobile navigation,
  `LanguageSwitcher`, `ShareBar`, `VideoPlayer`.

**Explicitly out of the first release**

`Reveal`, `CountUp`, `Glow`, `BgMark`, `Pill`, `IconBox`. These appear only in
numbers.ch. They are that site's visual language, not a shared system, and
promoting them would encode one client's brand into the package. Revisit when a
second project needs one.

Each component ships with: a typed documented API, keyboard and accessibility
coverage, a workbench story, loading/disabled/error/empty states where they
apply, responsive verification, and an explicit server or client boundary.

### Planning scope

The three tiers total roughly twenty components — too much for one
implementation plan. The first plan covers **repository bootstrap, the token
contract, the workbench, the release pipeline, and Tier 1 only**. Tiers 2 and 3
each get their own plan once the pipeline has published something real. This
keeps the first plan's success criterion concrete: a consumer can install
`@sankara-ui/core`, add one `@source` line, and render a themed `Carousel`.

## Testing

- **Vitest** for logic that can actually break: carousel index maths, easing,
  token fallback resolution.
- **Storybook** as the workbench, with the accessibility addon, so every
  component is exercised outside a consuming app.
- **Visual regression** is sequenced after the first release. Baselines for
  components that have never had a visual test catch mostly churn, and it is the
  piece most likely to stall the initial push. This is sequencing, not a cut.

## Release

Changesets for versioning and changelog. CI runs build, typecheck and tests;
publish on tag with npm provenance. Stay on `0.x` until the template consumes
the package end to end.

First consumer is the template. Second is numbers.ch — retrofitting the repo the
code came from is the honest test of whether the tokens parameterised anything.

## Risks and open questions

- **Preserving `'use client'` through the build.** Bundlers strip directives,
  and getting this wrong breaks every consumer simultaneously. The build tool
  must be chosen against this constraint and verified with a real consumer
  before the first publish. Not yet decided.
- **~~The npm scope is unverified.~~ Resolved 2026-07-30.** Both `@sankara` and
  `@sankara-interactive` were already taken. The org `sankara-ui` was registered
  instead, so the package is `@sankara-ui/core` — a second segment is required or
  it stutters as `@sankara-ui/ui`. Future packages take the same scope:
  `@sankara-ui/storyblok` for the Track A adapter layer. Note that `npm org
  create` does not exist; orgs are created only at npmjs.com/org/create, and
  scope availability cannot be checked from the CLI.
- **Tailwind major-version coupling.** A consumer on a future Tailwind major
  may not compile the package's classes. Accepted; revisit at Tailwind v5.
- **A forgotten `@source` line renders components unstyled** with no error. The
  README must lead with it, and the template should ship it preconfigured.

## Non-goals

- A general-purpose design system. Build what the survey found.
- Supporting non-Next or non-Tailwind consumers.
- Replacing Radix or Headless UI in already-shipped sites. New work only.
