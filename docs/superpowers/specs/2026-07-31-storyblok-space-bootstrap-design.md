# Storyblok Space Bootstrap — Design

Date: 2026-07-31
Status: Approved, not yet implemented

## Problem

Standing up a Storyblok space for this template is manual. A fresh space arrives
with Storyblok's starter structure (`page` plus `feature`/`grid`/`teaser`), which
does not match the template's conventions, carries no `data/` folder, and gives no
content to exercise the renderer against.

Two consequences:

- The Phase 0 smoke test (rich text, embedded bloks, preview editing, internal and
  email links) has never been run, because no space is known to contain content
  that covers those cases.
- Phase A2's CMS redirects (PR #26) have no runtime verification at all — the
  `redirects` content type does not exist in any space.

## Decisions

- **The Storyblok UI stays the source of truth for schema.** The committed
  baseline exists to _bootstrap_ a new space, not to govern existing ones.
  `yarn sync` remains the workflow for real spaces. This preserves the existing
  rule in `CLAUDE.md` rather than inverting it.
- **The demo space is a reproducible dev/preview space, not a CI dependency.**
  CI stays offline behind `STORYBLOK_SKIP_FETCH`. No integration tests, no read
  tokens in CI, no network flakiness in the gate.
- **One content type, `page`.** The homepage is the story at slug `home`, which
  the catch-all already special-cases. No separate `home` type.
- **`body` only, no `header` field.** A hero is the first section in `body`.
- **Bootstrap via the existing CLI push commands**, not a code-driven schema DSL
  and not a hand-rolled Management API script. Rationale under Approach below.

## Approach

`storyblok components push` and `storyblok stories push`, driven by committed
JSON, wrapped in one script entry point.

Rejected alternatives:

- **`storyblok schema push` with a TypeScript entry file.** Purpose-built, handles
  deletion via `--delete`, supports `--dry-run` and changeset rollback. Rejected
  for now because the installed `storyblok@4.21.1` package exports only field
  types — no schema DSL — so the entry-file format cannot be verified without
  running `schema init` against a live space. It is also the code-driven
  _governance_ tool, which conflicts with keeping the UI authoritative. Worth
  revisiting once the format has been observed.
- **A `scripts/setup-space.mjs` over the Management API.** Full control including
  deletion, but roughly 150 lines reimplementing what the CLI already does, to
  automate deleting three bloks once per space.

## What ships

### Schema

`.storyblok/components/baseline/components.baseline.json`, hand-authored and
committed. Pushed with `components push --from baseline --suffix baseline`.

| Component      | Kind                    | Fields                                                                                       |
| -------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| `page`         | content type, `is_root` | `body` (bloks, restricted by tag `section`); `seo` (custom, `meta-fields`) inside an SEO tab |
| `text_section` | nestable, tag `section` | `eyebrow` text, `headline` text, `lead` richtext, `link` multilink                           |
| `redirects`    | content type, `is_root` | `entries` (bloks → `redirect`)                                                               |
| `redirect`     | nestable                | `source` text, `destination` text, `permanent` boolean                                       |

`text_section` uses the field vocabulary already documented in `CLAUDE.md`
(`eyebrow`/`headline`/`lead`/`link`) and is whitelisted by tag per the same
convention, so it serves as the worked example a contributor copies rather than
throwaway demo filler.

### Code

A blok absent from the registry silently renders nothing, so the baseline also
requires:

- `components/nestables/TextSection.tsx`, generated via `yarn scaffold`
- a `text_section` entry in the `lib/storyblok.ts` registry

It renders through `RichTextRenderer` and `SbLink`, which is exactly what the
Phase 0 smoke test needs to cover.

`feature`, `grid` and `teaser` stay in the codebase — space `202685` still uses
`grid` and `teaser`, so removing them from code would break the live space.

Removing them from a _newly bootstrapped_ space is a **manual step**.
`components push` creates and updates components but has no `--delete`, so the
three Storyblok starters survive the push and must be deleted in the Storyblok
UI afterwards. This is the accepted cost of choosing this approach over
`schema push --delete` or a Management API script: deleting three bloks once per
space does not justify either. `setup:space` prints the reminder as its closing
output so the step is not silently skipped.

### Content

`.storyblok/stories/baseline/`, pushed with
`stories push --from baseline --publish`. The `--from` is load-bearing: without
it the CLI reads `.storyblok/stories/<target-space-id>/` and finds nothing.

- **`home`** (`page`) — one `text_section` whose `lead` richtext contains a
  paragraph with marks, an internal link, an email link, and an embedded blok.
  The embedded blok is a nested `text_section`; recursive, which is the point —
  it proves registry resolution works inside richtext.
- **`about`** (`page`) — gives internal links a real target and makes
  `generateStaticParams` return more than one path.
- **`data/redirects`** (`redirects`) — one entry, `/alt` → `/about`, permanent.
  `/alt` resolves to no story, so it 404s, reaches the redirect boundary, and
  redirects. This makes the demo space a live end-to-end proof of Phase A2.

Together these cover every item on the unrun Phase 0 smoke test.

### Entry point

`yarn setup:space --space <id> --yes`

It runs the two push commands, then prints the manual follow-up: delete
`feature`, `grid` and `teaser` in the Storyblok UI. The bootstrap is not
complete until that is done.

## Guardrails

- `--space` is **mandatory**; the script must not fall back to
  `STORYBLOK_SPACE_ID`. The local `.env` points at the live space `202685`, so a
  bootstrap inheriting that default would push components into production.
- The resolved target space is echoed, and `--yes` is required to proceed.
  `components push` has no `--dry-run` (only `stories push` does), so explicit
  confirmation is the guard rather than preview.
- Missing authentication fails early with the fix in the message — see
  Authentication below. A personal access token is not sufficient.
- Nothing writes to `.env`.

## Testing

The bootstrap itself is two CLI calls with little worth unit-testing. The
committed baseline JSON is what earns a test, in vitest:

- every blok named in a `component_whitelist` or restricted tag exists in the file
- content types are `is_root`; nestables are `is_nestable`
- every nestable reachable from a **routable** content type's bloks fields has a
  key in the `lib/storyblok.ts` registry

The last assertion catches the failure `CLAUDE.md` warns about — a name mismatch
causing a silent no-render — which is otherwise invisible until a page is loaded.

"Routable" is load-bearing: `redirect` is a nestable, but it is reached only from
`redirects`, a `data/` content type that `getRedirects()` parses as data and never
renders. Requiring a registry key for it would force a renderer that does nothing.
Data-only bloks are therefore exempt, and the test derives that from reachability
rather than a hand-maintained exclusion list.

## Verified against the Template space (294223376817452)

Settled empirically on 2026-07-31, authenticated as `emanuel@sankara.ch`:

1. **`--from` accepts a non-numeric directory name.** `const fromSpace =
options.from || space` is used as a plain directory string with no numeric
   validation, so `--from baseline` reads `<path>/components/baseline/`.
   `components push` also hard-errors without `--space`, so part of the guardrail
   is built into the CLI.
2. **Component layout** is `<path>/components/<dir>/components.json`.
3. **Story layout** is `<path>/stories/<dir>/<slug>_<uuid>.json`, each holding the
   full story object (`content`, `full_slug`, `is_folder`, `is_startpage`, …).
   Baseline stories therefore need stable hand-picked UUIDs.
4. The target space contains exactly the Storyblok starter set — `feature`,
   `grid`, `page`, `teaser` and one `home` story — so bootstrapping destroys
   nothing of value.

Still open, with a trivial fallback: is a stable tab key such as `tab-seo` valid,
where the live space uses `tab-<uuid>`? Fallback: generate a uuid-suffixed key.

## Authentication

**The CLI needs a session created by `storyblok login` with the _email_ method.**
This is not interchangeable with a personal access token:

- Both `components pull` and `components push` call `fetchComponentInternalTags`
  unconditionally, inside a `Promise.all`. A personal access token returns
  `403 {"error":"This endpoint does not support this token type"}` on
  `/v1/spaces/<id>/internal_tags`, which aborts the whole command. This is not
  avoidable by keeping tags out of the baseline.
- Setting `STORYBLOK_TOKEN` in `.env` does not help: `getEnvCredentials()` uses it
  only when `STORYBLOK_LOGIN` **and** `STORYBLOK_REGION` are set alongside it, and
  otherwise falls through to the stored session in `~/.storyblok/credentials.json`.

`setup:space` therefore checks for a working session rather than an environment
variable, and says "run `storyblok login -r eu` and choose email" when one is
missing.

### Three distinct credentials

They are easy to confuse because the names are similar. They are not
interchangeable:

| Credential                       | Used for                                    | Supplied via                                     |
| -------------------------------- | ------------------------------------------- | ------------------------------------------------ |
| CLI session (OAuth, email login) | `components push/pull`, `stories push/pull` | `storyblok login -r eu`, stored outside the repo |
| `STORYBLOK_MANAGEMENT_TOKEN`     | direct Management API reads, and deletes    | `.env`, sent as an `Authorization` header        |
| `NEXT_PUBLIC_STORYBLOK_TOKEN`    | delivery/CDN reads from the app             | `.env`, validated by `lib/env.ts`                |

The management token is a personal access token. It is sufficient for reading
components and stories and for deleting them, but it cannot drive
`components push`, because that command calls `/internal_tags` — which is the
403 above. Deletion is the one schema operation the CLI cannot perform at all
(`components push` creates and updates only), so removing a component needs
either this token against the Management API or `schema push --delete`.

## Limitations, stated plainly

- **The push direction is still unproven.** `components pull` and `stories pull`
  have been run against the target space and the layouts are recorded above, but
  no push has been attempted. Whether a hand-authored baseline is accepted as-is —
  particularly the tab key and the `meta-fields` custom field — is only settled by
  running it.
- **Deleting the starter components is not automated.** `components push` has no
  `--delete`; the step is manual and therefore skippable. If it proves annoying in
  practice, the cheapest fix is a small Management API call in `setup:space`
  rather than adopting `schema push`.
- **The baseline will drift** as spaces evolve in the UI. This was an accepted
  trade-off of keeping the UI authoritative. The registry-coverage test limits the
  damage to code/schema mismatches; detecting genuine drift against a live space
  would need a token in CI, which the no-integration-tests decision rules out.

## Dependencies

- Phase A2's redirect resolution (**PR #26**, `feat/cms-redirects`) is merged, so
  `lib/redirects.ts` and the 404-boundary lookup are on `main`. It is inert until
  this bootstrap creates the `redirects` and `redirect` components and the
  `data/redirects` story — which is what makes the demo space the first runtime
  proof that A2 works.

## Follow-up

- Run `/simplify` across `lib/redirects.ts`, the catch-all integration, the
  baseline JSON and `setup:space` once the bootstrap is fully implemented.
  Deliberately deferred until the whole shape exists.
