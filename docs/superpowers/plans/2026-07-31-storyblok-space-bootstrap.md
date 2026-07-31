# Storyblok Space Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a Storyblok space reproducibly from committed JSON, so the demo space (and any new client space) has the template's structure and enough content to run the Phase 0 smoke test.

**Architecture:** A curated component schema and a set of stories live in `.storyblok/…/baseline/`. `yarn setup:space --space <id> --yes` pushes both with the existing Storyblok CLI. A vitest suite validates the committed JSON so a typo cannot reach a space. Nothing governs existing spaces — the UI stays the schema source of truth.

**Tech Stack:** Storyblok CLI 4.21.1, Node 22, vitest 4, Next 16 App Router, TypeScript.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-07-31-storyblok-space-bootstrap-design.md`.
- Target space for all manual verification: **294223376817452** ("Template", eu).
- Authentication is a CLI session from `storyblok login -r eu` using the **email** method. A personal access token 403s on `/internal_tags`, which `components pull` and `components push` both call unconditionally. Never instruct anyone to use `STORYBLOK_TOKEN` alone.
- Never edit `.env` or `.env.example` — CLAUDE.md forbids touching `.env*`.
- Registry key = exact snake_case technical name. A mismatch renders nothing, silently.
- Never commit on `main`; work on a branch and open a PR.
- `yarn check` must pass before every commit that touches code.
- Storyblok component objects are a **top-level JSON array**, not `{components: […]}`.

## Deviation from the spec, decided during planning

The spec says `page.body` is "restricted by tag `section`". **Implement it as an explicit `component_whitelist` instead.** A tag restriction serialises as `restrict_type: "tags"` plus `component_tag_whitelist`, which holds server-assigned tag IDs that a hand-authored baseline cannot know — it would not port to a fresh space, which is the entire purpose. CLAUDE.md reserves tag-based whitelisting for many shared bloks and says to enumerate parent-specific children explicitly. With one section blok, explicit is both correct and portable. Tags can be introduced in the UI later once a space has several sections.

## File structure

| File                                                      | Responsibility                                                                          |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `.storyblok/components/baseline/components.baseline.json` | The curated schema: `page`, `text_section`, `redirects`, `redirect`.                    |
| `.storyblok/stories/baseline/*.json`                      | Baseline content: `home`, `about`, `data/redirects`, plus the `data` folder.            |
| `components/nestables/TextSection.tsx`                    | Renders `text_section`. Exercises `RichTextRenderer` and `SbLink`.                      |
| `lib/storyblok.ts`                                        | Registry. Gains an exported `components` map so it can be asserted against.             |
| `lib/storyblok-baseline.ts`                               | Loads and interprets the baseline JSON; pure functions, no I/O beyond reading the file. |
| `lib/storyblok-baseline.test.ts`                          | Structural validation plus registry coverage.                                           |
| `scripts/setup-space.mjs`                                 | The `yarn setup:space` entry point and its guardrails.                                  |
| `scripts/setup-space.test.ts`                             | Guardrail behaviour (argument parsing only; no network).                                |

Note `lib/storyblok-baseline.ts` is deliberately separate from the test so the reachability logic is testable and reusable rather than buried in assertions.

---

### Task 1: Prove a hand-authored component pushes

The spec flags the push direction as unproven. Settle it before investing in the full baseline. If this task fails, stop and revisit the approach — do not continue to Task 2.

**Files:**

- Create: `.storyblok/components/baseline/components.baseline.json`

**Interfaces:**

- Produces: the baseline schema file that every later task extends, and the verified fact that `components push --from baseline --suffix baseline --space <id>` works.

- [ ] **Step 1: Create a branch**

```bash
git checkout main && git pull --ff-only
git checkout -b feat/space-bootstrap
```

- [ ] **Step 2: Write the minimal baseline with one component**

Create `.storyblok/components/baseline/components.baseline.json`. Omit `id`, `created_at` and `updated_at` — those are server-assigned, and including stale values risks the push matching the wrong record.

```json
[
  {
    "name": "text_section",
    "display_name": "Text Section",
    "is_root": false,
    "is_nestable": true,
    "schema": {
      "eyebrow": { "type": "text", "pos": 0 },
      "headline": { "type": "text", "pos": 1 },
      "lead": { "type": "richtext", "pos": 2 },
      "link": { "type": "multilink", "pos": 3 }
    },
    "internal_tags_list": [],
    "internal_tag_ids": []
  }
]
```

- [ ] **Step 3: Confirm you are authenticated as the right user**

Run: `yarn storyblok user`
Expected: `Hi …, you are currently logged in with <email> on eu region`.
If it says you are not logged in, run `yarn storyblok login -r eu` in a real terminal and choose **With email**. A personal access token will fail later at `/internal_tags`.

- [ ] **Step 4: Push the single component**

Run:

```bash
yarn storyblok components push --from baseline --suffix baseline --space 294223376817452
```

Expected: completes without `Failed`. Note that `--from baseline` makes the CLI read `.storyblok/components/baseline/`; without it the CLI reads `.storyblok/components/294223376817452/`, which does not exist.

- [ ] **Step 5: Verify the component actually exists in the space**

Do not trust the CLI's exit status alone — confirm server-side:

```bash
set -a; . ./.env >/dev/null 2>&1; set +a
curl -s -H "Authorization: $STORYBLOK_TOKEN" \
  "https://mapi.storyblok.com/v1/spaces/294223376817452/components" \
  | python3 -c "import json,sys; print(sorted(c['name'] for c in json.load(sys.stdin)['components']))"
```

Expected: the list includes `text_section` alongside `feature`, `grid`, `page`, `teaser`.

(The read-only `components` endpoint works with the `.env` personal token even though `internal_tags` does not, which is why this verification step can use it.)

- [ ] **Step 6: Commit**

```bash
git add .storyblok/components/baseline/components.baseline.json
git commit -m "Prove a hand-authored Storyblok component pushes"
```

---

### Task 2: Complete the baseline schema

**Files:**

- Modify: `.storyblok/components/baseline/components.baseline.json`

**Interfaces:**

- Consumes: the file from Task 1.
- Produces: four components — `page`, `text_section`, `redirects`, `redirect`. `page.body` whitelists `text_section`. `redirects.entries` whitelists `redirect`.

- [ ] **Step 1: Replace the file with the full baseline**

`tab-seo` groups `seo` into an SEO tab. The live space uses a uuid-suffixed key (`tab-<uuid>`); a stable key is attempted here and Step 2 verifies whether Storyblok accepts it.

```json
[
  {
    "name": "page",
    "display_name": "Page",
    "is_root": true,
    "is_nestable": false,
    "schema": {
      "body": {
        "type": "bloks",
        "pos": 0,
        "restrict_components": true,
        "restrict_type": "",
        "component_whitelist": ["text_section"]
      },
      "tab-seo": {
        "type": "tab",
        "display_name": "SEO",
        "keys": ["seo"],
        "pos": 1
      },
      "seo": {
        "type": "custom",
        "field_type": "meta-fields",
        "pos": 2,
        "options": []
      }
    },
    "internal_tags_list": [],
    "internal_tag_ids": []
  },
  {
    "name": "text_section",
    "display_name": "Text Section",
    "is_root": false,
    "is_nestable": true,
    "schema": {
      "eyebrow": { "type": "text", "pos": 0 },
      "headline": { "type": "text", "pos": 1 },
      "lead": { "type": "richtext", "pos": 2 },
      "link": { "type": "multilink", "pos": 3 }
    },
    "internal_tags_list": [],
    "internal_tag_ids": []
  },
  {
    "name": "redirects",
    "display_name": "Redirects",
    "is_root": true,
    "is_nestable": false,
    "schema": {
      "entries": {
        "type": "bloks",
        "pos": 0,
        "restrict_components": true,
        "restrict_type": "",
        "component_whitelist": ["redirect"]
      }
    },
    "internal_tags_list": [],
    "internal_tag_ids": []
  },
  {
    "name": "redirect",
    "display_name": "Redirect",
    "is_root": false,
    "is_nestable": true,
    "schema": {
      "source": { "type": "text", "pos": 0 },
      "destination": { "type": "text", "pos": 1 },
      "permanent": { "type": "boolean", "pos": 2, "default_value": true }
    },
    "internal_tags_list": [],
    "internal_tag_ids": []
  }
]
```

- [ ] **Step 2: Push and verify the SEO tab survived**

```bash
yarn storyblok components push --from baseline --suffix baseline --space 294223376817452
set -a; . ./.env >/dev/null 2>&1; set +a
curl -s -H "Authorization: $STORYBLOK_TOKEN" \
  "https://mapi.storyblok.com/v1/spaces/294223376817452/components" \
  | python3 -c "
import json,sys
cs={c['name']:c for c in json.load(sys.stdin)['components']}
print('components:', sorted(cs))
print('page schema keys:', sorted(cs['page']['schema']))
print('body whitelist:', cs['page']['schema']['body'].get('component_whitelist'))
"
```

Expected: components include `page`, `redirect`, `redirects`, `text_section`; `page` schema keys include a `tab-…` entry plus `body` and `seo`; body whitelist is `['text_section']`.

If the tab key was rejected or renamed, copy the key Storyblok actually stored back into the baseline file and push again. That is the documented fallback.

- [ ] **Step 3: Commit**

```bash
git add .storyblok/components/baseline/components.baseline.json
git commit -m "Add the full baseline schema: page, redirects, redirect"
```

---

### Task 3: Baseline loader and structural validation

**Files:**

- Create: `lib/storyblok-baseline.ts`
- Create: `lib/storyblok-baseline.test.ts`

**Interfaces:**

- Produces:
  - `type BaselineComponent = { name: string; is_root?: boolean; is_nestable?: boolean; schema: Record<string, BaselineField> }`
  - `type BaselineField = { type: string; component_whitelist?: string[]; keys?: string[] }`
  - `loadBaseline(): BaselineComponent[]`
  - `whitelistedBloks(component: BaselineComponent): string[]`

- [ ] **Step 1: Write the failing test**

Create `lib/storyblok-baseline.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { loadBaseline, whitelistedBloks } from './storyblok-baseline'

const baseline = loadBaseline()
const byName = new Map(baseline.map(c => [c.name, c]))

describe('baseline schema', () => {
  it('contains the four expected components', () => {
    expect([...byName.keys()].sort()).toEqual(['page', 'redirect', 'redirects', 'text_section'])
  })

  it('every whitelisted blok exists in the file', () => {
    for (const component of baseline) {
      for (const child of whitelistedBloks(component)) {
        expect(byName.has(child), `${component.name} whitelists missing blok ${child}`).toBe(true)
      }
    }
  })

  it('whitelisted bloks are nestable, never content types', () => {
    for (const component of baseline) {
      for (const child of whitelistedBloks(component)) {
        expect(byName.get(child)!.is_nestable, `${child} must be nestable`).toBe(true)
        expect(byName.get(child)!.is_root, `${child} must not be a content type`).toBe(false)
      }
    }
  })

  it('tab keys reference fields that exist', () => {
    for (const component of baseline) {
      for (const [name, field] of Object.entries(component.schema)) {
        if (field.type !== 'tab') continue
        for (const key of field.keys ?? []) {
          expect(
            key in component.schema,
            `${component.name} tab ${name} references missing ${key}`
          ).toBe(true)
        }
      }
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run lib/storyblok-baseline.test.ts`
Expected: FAIL — cannot resolve `./storyblok-baseline`.

- [ ] **Step 3: Implement the loader**

Create `lib/storyblok-baseline.ts`. No `server-only` import — this is build/test tooling, not request-path code, and the test imports it directly.

```ts
import fs from 'node:fs'
import path from 'node:path'

export type BaselineField = {
  type: string
  component_whitelist?: string[]
  keys?: string[]
}

export type BaselineComponent = {
  name: string
  is_root?: boolean
  is_nestable?: boolean
  schema: Record<string, BaselineField>
}

const BASELINE_PATH = path.join(
  process.cwd(),
  '.storyblok/components/baseline/components.baseline.json'
)

export function loadBaseline(): BaselineComponent[] {
  return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'))
}

/** Blok names a component's bloks fields allow, across every field. */
export function whitelistedBloks(component: BaselineComponent): string[] {
  return Object.values(component.schema).flatMap(field => field.component_whitelist ?? [])
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn vitest run lib/storyblok-baseline.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Prove the test can fail**

Temporarily change `component_whitelist` in the baseline's `page.body` to `["text_sektion"]`, re-run the test, and confirm "every whitelisted blok exists in the file" fails. Then restore the file and re-run to confirm it passes again. A check that cannot fail is not a check.

- [ ] **Step 6: Commit**

```bash
yarn check
git add lib/storyblok-baseline.ts lib/storyblok-baseline.test.ts
git commit -m "Validate the committed baseline schema"
```

---

### Task 4: TextSection component and registry

**Files:**

- Create: `components/nestables/TextSection.tsx`
- Modify: `lib/storyblok.ts`

**Interfaces:**

- Consumes: `RichTextRenderer` from `components/helpers/RichTextRenderer` and `SbLink` from `components/helpers/SbLink`.
- Produces: `export const components` from `lib/storyblok.ts` — a `Record<string, unknown>` whose keys are the registry's snake_case blok names. Task 6 asserts against it.

- [ ] **Step 1: Regenerate types so `TextSectionStoryblok` exists**

The baseline is not the pulled schema, so generated types do not yet know `text_section`. Pull the space you pushed to in Task 2 and regenerate:

```bash
yarn sync
```

Run `yarn types:check` and expect it to pass. Confirm `TextSectionStoryblok` now exists:

```bash
grep -n "TextSectionStoryblok" .storyblok/types/*/storyblok-components.d.ts
```

If `yarn sync` pulls into a second space directory, `yarn types:check` will fail with "Expected one committed Storyblok component set". In that case delete the stale directory for the space you are not targeting and re-run.

- [ ] **Step 2: Write the component**

Create `components/nestables/TextSection.tsx`, matching the style of `components/nestables/Teaser.tsx`:

```tsx
import { TextSectionStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'
import { SbLink } from '@/components/helpers/SbLink'

export default function TextSection({ blok }: { blok: TextSectionStoryblok }) {
  return (
    <section
      className="container mx-auto px-4 py-12"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      {blok.eyebrow && <p className="text-sm uppercase tracking-wide mb-2">{blok.eyebrow}</p>}
      {blok.headline && <h2 className="text-3xl font-medium mb-4">{blok.headline}</h2>}
      {blok.lead && <RichTextRenderer text={blok.lead} className="prose mb-6" />}
      {blok.link && (
        <SbLink link={blok.link} className="underline">
          Mehr erfahren
        </SbLink>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Register it and export the map**

Modify `lib/storyblok.ts`. Export `components` so it can be asserted against — `storyblokInit` does not expose its registry.

```ts
import { apiPlugin, storyblokInit } from '@storyblok/react/rsc'
import { env } from './env'
import page from '@/components/content_types/Page'
import feature from '@/components/nestables/Feature'
import grid from '@/components/nestables/Grid'
import privacy_bee from '@/components/nestables/PrivacyBee'
import teaser from '@/components/nestables/Teaser'
import text_section from '@/components/nestables/TextSection'

export const components = {
  page,
  feature,
  grid,
  teaser,
  privacy_bee,
  text_section,
}

export const getStoryblokApi = storyblokInit({
  accessToken: env.NEXT_PUBLIC_STORYBLOK_TOKEN,
  use: [apiPlugin],
  components,
})
```

- [ ] **Step 4: Verify the build and gate**

Run: `yarn check`
Expected: PASS.

Run: `rm -rf .next && STORYBLOK_SKIP_FETCH=true yarn build`
Expected: PASS, route table still shows `● /[[...slug]]`.

- [ ] **Step 5: Commit**

```bash
git add components/nestables/TextSection.tsx lib/storyblok.ts .storyblok
git commit -m "Add the text_section blok and register it"
```

---

### Task 5: Baseline stories

**Files:**

- Create: `.storyblok/stories/baseline/home_11111111-1111-4111-8111-111111111111.json`
- Create: `.storyblok/stories/baseline/about_22222222-2222-4222-8222-222222222222.json`
- Create: `.storyblok/stories/baseline/data_33333333-3333-4333-8333-333333333333.json`
- Create: `.storyblok/stories/baseline/redirects_44444444-4444-4444-8444-444444444444.json`

UUIDs are fixed and hand-picked so the baseline is reproducible; the filename format `<slug>_<uuid>.json` is what `stories pull` produces and `stories push` expects.

**Interfaces:**

- Consumes: the component names from Task 2.
- Produces: content covering every Phase 0 smoke-test case.

- [ ] **Step 1: Write the `home` story**

`lead` carries a mark, an internal link, an email link and an embedded blok — the four things the smoke test needs.

```json
{
  "name": "Home",
  "slug": "home",
  "full_slug": "home",
  "uuid": "11111111-1111-4111-8111-111111111111",
  "is_folder": false,
  "is_startpage": false,
  "parent_id": 0,
  "position": 0,
  "content": {
    "_uid": "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    "component": "page",
    "body": [
      {
        "_uid": "aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa",
        "component": "text_section",
        "eyebrow": "Willkommen",
        "headline": "Template-Demoseite",
        "link": {
          "id": "22222222-2222-4222-8222-222222222222",
          "linktype": "story",
          "fieldtype": "multilink",
          "cached_url": "about",
          "url": ""
        },
        "lead": {
          "type": "doc",
          "content": [
            {
              "type": "paragraph",
              "content": [
                { "type": "text", "text": "Dieser Text ist " },
                { "type": "text", "text": "fett", "marks": [{ "type": "bold" }] },
                { "type": "text", "text": " und verlinkt auf " },
                {
                  "type": "text",
                  "text": "die Über-uns-Seite",
                  "marks": [
                    {
                      "type": "link",
                      "attrs": {
                        "href": "about",
                        "uuid": "22222222-2222-4222-8222-222222222222",
                        "linktype": "story",
                        "target": "_self"
                      }
                    }
                  ]
                },
                { "type": "text", "text": " sowie auf " },
                {
                  "type": "text",
                  "text": "eine E-Mail-Adresse",
                  "marks": [
                    {
                      "type": "link",
                      "attrs": {
                        "href": "hallo@example.ch",
                        "linktype": "email",
                        "target": "_self"
                      }
                    }
                  ]
                },
                { "type": "text", "text": "." }
              ]
            },
            {
              "type": "blok",
              "attrs": {
                "id": "aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa",
                "body": [
                  {
                    "_uid": "aaaaaaaa-4444-4444-8444-aaaaaaaaaaaa",
                    "component": "text_section",
                    "headline": "Eingebetteter Blok"
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}
```

- [ ] **Step 2: Write the `about` story**

```json
{
  "name": "Über uns",
  "slug": "about",
  "full_slug": "about",
  "uuid": "22222222-2222-4222-8222-222222222222",
  "is_folder": false,
  "is_startpage": false,
  "parent_id": 0,
  "position": 1,
  "content": {
    "_uid": "bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb",
    "component": "page",
    "body": [
      {
        "_uid": "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
        "component": "text_section",
        "headline": "Über uns",
        "eyebrow": "Team"
      }
    ]
  }
}
```

- [ ] **Step 3: Write the `data` folder and the `redirects` story**

The folder must exist before the story inside it. `data` folder:

```json
{
  "name": "data",
  "slug": "data",
  "full_slug": "data",
  "uuid": "33333333-3333-4333-8333-333333333333",
  "is_folder": true,
  "parent_id": 0,
  "position": 2,
  "content": {}
}
```

`data/redirects` story — `/alt` resolves to no story, so it 404s and the redirect fires:

```json
{
  "name": "Redirects",
  "slug": "redirects",
  "full_slug": "data/redirects",
  "uuid": "44444444-4444-4444-8444-444444444444",
  "is_folder": false,
  "position": 0,
  "content": {
    "_uid": "cccccccc-1111-4111-8111-cccccccccccc",
    "component": "redirects",
    "entries": [
      {
        "_uid": "cccccccc-2222-4222-8222-cccccccccccc",
        "component": "redirect",
        "source": "/alt",
        "destination": "/about",
        "permanent": true
      }
    ]
  }
}
```

- [ ] **Step 4: Push the stories and verify server-side**

```bash
yarn storyblok stories push --from baseline --space 294223376817452 --publish
set -a; . ./.env >/dev/null 2>&1; set +a
curl -s -H "Authorization: $STORYBLOK_TOKEN" \
  "https://mapi.storyblok.com/v1/spaces/294223376817452/stories" \
  | python3 -c "
import json,sys
for s in json.load(sys.stdin)['stories']:
    print(f\"{s['full_slug']:20} folder={s['is_folder']} published={s.get('published')}\")
"
```

Expected: `home`, `about`, `data` (folder) and `data/redirects` all present and published.

If `stories push` rejects the hand-written files, run `yarn storyblok stories pull --space 294223376817452 --path /tmp/sb` and diff a pulled file against yours to find the missing required field. Fix and repeat.

- [ ] **Step 5: Commit**

```bash
git add .storyblok/stories/baseline
git commit -m "Add baseline stories covering the Phase 0 smoke test"
```

---

### Task 6: Registry coverage test

**Files:**

- Modify: `lib/storyblok-baseline.ts`
- Modify: `lib/storyblok-baseline.test.ts`

**Interfaces:**

- Consumes: `loadBaseline`, `whitelistedBloks` (Task 3); `components` from `lib/storyblok.ts` (Task 4); `isDataRoute` from `lib/storyblok-routes.ts`.
- Produces: `renderableBloks(): string[]`.

Reachability, not an exclusion list: a content type is renderable if a **non-`data/`** baseline story uses it. `redirect` is reached only from `redirects`, which only `data/redirects` uses, so it is exempt without being named.

- [ ] **Step 1: Write the failing test**

Add these two imports alongside the existing imports at the **top** of
`lib/storyblok-baseline.test.ts`, then extend the existing
`import { loadBaseline, whitelistedBloks } from './storyblok-baseline'` line to
also import `renderableBloks`:

```ts
import { components } from './storyblok'
```

Then append this block at the end of the file:

```ts
describe('registry coverage', () => {
  it('every renderable blok has a registry key', () => {
    for (const name of renderableBloks()) {
      expect(name in components, `${name} is renderable but missing from lib/storyblok.ts`).toBe(
        true
      )
    }
  })

  it('exempts data-only bloks', () => {
    expect(renderableBloks()).not.toContain('redirect')
    expect(renderableBloks()).toContain('text_section')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `yarn vitest run lib/storyblok-baseline.test.ts`
Expected: FAIL — `renderableBloks` is not exported.

- [ ] **Step 3: Implement `renderableBloks`**

Add this import at the **top** of `lib/storyblok-baseline.ts`, beside the existing
`node:fs` and `node:path` imports:

```ts
import { isDataRoute } from './storyblok-routes'
```

Then append the rest at the end of the file:

```ts
type BaselineStory = {
  full_slug: string
  is_folder?: boolean
  content?: { component?: string }
}

const STORIES_DIR = path.join(process.cwd(), '.storyblok/stories/baseline')

export function loadBaselineStories(): BaselineStory[] {
  return fs
    .readdirSync(STORIES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(file => JSON.parse(fs.readFileSync(path.join(STORIES_DIR, file), 'utf8')))
}

/** Bloks reachable from a routable story, so they must render. Data-only bloks are excluded. */
export function renderableBloks(): string[] {
  const byName = new Map(loadBaseline().map(c => [c.name, c]))
  const roots = loadBaselineStories()
    .filter(story => !story.is_folder && !isDataRoute(story.full_slug))
    .map(story => story.content?.component)
    .filter((name): name is string => Boolean(name))

  const seen = new Set<string>()
  const queue = [...roots]
  while (queue.length) {
    const name = queue.shift()!
    if (seen.has(name)) continue
    seen.add(name)
    const component = byName.get(name)
    if (component) queue.push(...whitelistedBloks(component))
  }
  return [...seen]
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `yarn vitest run lib/storyblok-baseline.test.ts`
Expected: PASS.

- [ ] **Step 5: Prove it catches the real bug**

Temporarily rename the `text_section` key in `lib/storyblok.ts` to `textSection`. Re-run the test and confirm "every renderable blok has a registry key" fails — that is the silent-no-render bug CLAUDE.md warns about. Restore and re-run.

- [ ] **Step 6: Commit**

```bash
yarn check
git add lib/storyblok-baseline.ts lib/storyblok-baseline.test.ts
git commit -m "Assert every renderable baseline blok is registered"
```

---

### Task 7: The `setup:space` entry point

**Files:**

- Create: `scripts/setup-space.mjs`
- Create: `scripts/setup-space.test.ts`
- Modify: `package.json`
- Modify: `vitest.config.mts`

**Interfaces:**

- Produces: `yarn setup:space --space <id> --yes`, and `parseArgs(argv: string[]): { space: string; yes: boolean }` exported for testing.

- [ ] **Step 1: Add `scripts/` to the vitest include**

`vitest.config.mts` currently includes `lib/**`, `app/**` and `generators/**` only, so a test under `scripts/` would never run. Change the `include` line to:

```ts
include: [
  'lib/**/*.test.ts',
  'app/**/*.test.ts',
  'generators/**/*.test.ts',
  'scripts/**/*.test.ts',
],
```

- [ ] **Step 2: Write the failing test**

Create `scripts/setup-space.test.ts`. Guardrails only — no network.

```ts
import { describe, expect, it } from 'vitest'
import { parseArgs } from './setup-space.mjs'

describe('setup:space arguments', () => {
  it('parses an explicit space and confirmation', () => {
    expect(parseArgs(['--space', '12345', '--yes'])).toEqual({ space: '12345', yes: true })
  })

  it('rejects a missing --space rather than falling back to the environment', () => {
    process.env.STORYBLOK_SPACE_ID = '202685'
    expect(() => parseArgs(['--yes'])).toThrow(/--space/)
  })

  it('rejects a non-numeric space', () => {
    expect(() => parseArgs(['--space', 'baseline', '--yes'])).toThrow(/numeric/)
  })

  it('defaults --yes to false so a bare invocation cannot mutate a space', () => {
    expect(parseArgs(['--space', '12345']).yes).toBe(false)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `yarn vitest run scripts/setup-space.test.ts`
Expected: FAIL — cannot resolve `./setup-space.mjs`.

- [ ] **Step 4: Implement the script**

Create `scripts/setup-space.mjs`. Uses `process.env` directly, not `lib/env.ts` — it runs outside the Next bundle, like the other files in `scripts/`.

```js
#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

const SPACE_ID_PATTERN = /^\d+$/

/** Never falls back to STORYBLOK_SPACE_ID: that points at a live space. */
export function parseArgs(argv) {
  const spaceIndex = argv.indexOf('--space')
  const space = spaceIndex === -1 ? undefined : argv[spaceIndex + 1]
  if (!space) {
    throw new Error('Pass the target space explicitly: yarn setup:space --space <id> --yes')
  }
  if (!SPACE_ID_PATTERN.test(space)) {
    throw new Error(`Space id must be numeric, got "${space}"`)
  }
  return { space, yes: argv.includes('--yes') }
}

function run(args) {
  const result = spawnSync('yarn', ['storyblok', ...args], { stdio: 'inherit', encoding: 'utf8' })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

/** A personal access token 403s on /internal_tags, which components push calls. */
function requireSession() {
  const result = spawnSync('yarn', ['storyblok', 'user'], { encoding: 'utf8' })
  if (result.status !== 0 || !/logged in/i.test(result.stdout ?? '')) {
    console.error(
      'No Storyblok CLI session.\n' +
        'Run `storyblok login -r eu` and choose "With email".\n' +
        'A personal access token will not work: it is rejected by /internal_tags,\n' +
        'which `components push` calls unconditionally.'
    )
    process.exit(1)
  }
}

function main() {
  const { space, yes } = parseArgs(process.argv.slice(2))
  console.log(`Target space: ${space}`)
  if (!yes) {
    console.log('This overwrites components and stories in that space. Re-run with --yes.')
    process.exit(1)
  }
  requireSession()
  run(['components', 'push', '--from', 'baseline', '--suffix', 'baseline', '--space', space])
  run(['stories', 'push', '--from', 'baseline', '--space', space, '--publish'])
  console.log(
    '\nDone. One manual step remains: delete the Storyblok starter bloks\n' +
      '(feature, grid, teaser) in the UI — `components push` cannot delete.'
  )
}

if (import.meta.filename === process.argv[1]) main()
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `yarn vitest run scripts/setup-space.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 6: Add the script entry**

In `package.json` scripts, after `"scaffold"`:

```json
"setup:space": "node scripts/setup-space.mjs"
```

- [ ] **Step 7: Verify the guard actually guards**

Run: `yarn setup:space`
Expected: exits non-zero with the `--space` message, and pushes nothing.

Run: `yarn setup:space --space 294223376817452`
Expected: prints the target and the `--yes` message, and pushes nothing.

- [ ] **Step 8: Commit**

```bash
yarn check
git add scripts/setup-space.mjs scripts/setup-space.test.ts package.json vitest.config.mts
git commit -m "Add yarn setup:space with explicit-target guardrails"
```

---

### Task 8: End-to-end run, smoke test, documentation

**Files:**

- Modify: `README.md`
- Modify: `docs/enhancement-roadmap.md`

- [ ] **Step 1: Run the bootstrap end to end**

```bash
yarn setup:space --space 294223376817452 --yes
```

Expected: both pushes succeed and the closing reminder prints.

- [ ] **Step 2: Delete the starter bloks**

In the Storyblok UI for space 294223376817452, delete `feature`, `grid` and `teaser`. Confirm:

```bash
set -a; . ./.env >/dev/null 2>&1; set +a
curl -s -H "Authorization: $STORYBLOK_TOKEN" \
  "https://mapi.storyblok.com/v1/spaces/294223376817452/components" \
  | python3 -c "import json,sys; print(sorted(c['name'] for c in json.load(sys.stdin)['components']))"
```

Expected: exactly `['page', 'redirect', 'redirects', 'text_section']`.

- [ ] **Step 3: Point the app at the space and run the Phase 0 smoke test**

Set `STORYBLOK_SPACE_ID` and the tokens for this space in `.env` yourself — the agent must not edit `.env*`. Then `yarn dev` and check each item:

- `/` renders the headline, eyebrow and rich text.
- The bold mark renders.
- The internal link in rich text goes to `/about`.
- The email link renders as `mailto:hallo@example.ch`.
- The embedded blok inside rich text renders its headline — this is the registry-resolution case.
- `/alt` redirects to `/about` with a 308. Verify with `curl -sI http://localhost:3000/alt | head -3`.
- `/alt?utm_source=mail` redirects to `/about?utm_source=mail` — query preservation.
- Editing the `home` story in the Storyblok visual editor updates the preview.

- [ ] **Step 4: Document it in the README**

Add a section `### 10. Bootstrapping a new space` after the redirects section:

````markdown
### 10. Bootstrapping a new space

To give a fresh Storyblok space this template's structure and demo content:

```sh
yarn storyblok login -r eu   # choose "With email" — a personal access token will not work
yarn setup:space --space <space-id> --yes
```

This pushes the committed baseline from `.storyblok/components/baseline/` and
`.storyblok/stories/baseline/`: a `page` content type with an SEO tab, a
`text_section` blok, and the `data/redirects` global with one example entry.

Afterwards, delete the Storyblok starter bloks (`feature`, `grid`, `teaser`) in
the UI — `components push` creates and updates but cannot delete.

The baseline bootstraps _new_ spaces; it does not govern existing ones. For a
space already in use, the Storyblok UI stays the source of truth and `yarn sync`
pulls its schema.
````

- [ ] **Step 5: Update the roadmap**

In `docs/enhancement-roadmap.md`, tick the Phase A2 task "Create the `redirect` blok and `redirects` content type…" — the baseline now creates them — and mark the Phase 0 smoke-test item complete if Step 3 passed. If any smoke-test item failed, leave it unticked and record what failed.

- [ ] **Step 6: Commit and open a PR**

```bash
yarn check
git add README.md docs/enhancement-roadmap.md
git commit -m "Document the space bootstrap and record the smoke test"
git push -u origin feat/space-bootstrap
gh pr create --base main --title "Storyblok space bootstrap" --body "Implements docs/superpowers/specs/2026-07-31-storyblok-space-bootstrap-design.md"
```

---

## Notes for the implementer

- **Verify server-side, not by exit status.** Every push step has a `curl` check for a reason: an earlier probe in this project reported "Completed" for steps that had silently fetched nothing.
- **Confirm each check can fail.** Tasks 3 and 6 have explicit mutation steps. Do not skip them — two checks in this project's history passed while measuring nothing.
- **If a push is rejected**, pull the space into a scratch directory and diff against the hand-authored file. The pulled shape is ground truth; the plan's JSON is a best reconstruction of it.
