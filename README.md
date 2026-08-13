# Next.js Storyblok Boilerplate

This repository is a Next.js [Storyblok](https://www.storyblok.com) starter template.

## Requirements

To use this project you have to have a Storyblok account. If you don't have one yet you can register at [Storyblok](https://www.storyblok.com), it's free.

## How to get started?

Read the [Next.js 13 tutorial](https://www.storyblok.com/tp/add-a-headless-cms-to-next-js-13-in-5-minutes) about connecting Storyblok and Next.js

### 1. Use this template

Create a new repository from this template by clicking the **Use this template** button.

### 2. Install all dependencies

```sh
yarn # or npm install
```

### 3. Adding the Access token

Create a new empty space and copy the preview token. Create your `.env` from `.env.example`:

```sh
mv .env.example .env
```

Add the tokens and space ID from Storyblok, plus the two secrets, as environment variables:

```sh
STORYBLOK_SPACE_ID=<your-space-id>
NEXT_PUBLIC_STORYBLOK_TOKEN=<your-public-token>
STORYBLOK_PREVIEW_TOKEN=<your-preview-token>
API_SECRET=<a-strong-random-string-used-by-api-routes>
STORYBLOK_WEBHOOK_SECRET=<storyblok-webhook-signing-secret>
```

`NEXT_PUBLIC_STORYBLOK_TOKEN`, `STORYBLOK_PREVIEW_TOKEN` and `API_SECRET` are
validated on startup by `lib/env.ts` and required everywhere, so a missing one
fails immediately and names itself rather than breaking a route later.

`STORYBLOK_SPACE_ID` is not part of that validation — only the Storyblok CLI reads
it, via `storyblok.config.mjs`. The app boots without it; `yarn sync` does not.

`STORYBLOK_WEBHOOK_SECRET` is the exception: you cannot know it before deploying,
since Storyblok needs a reachable URL first, so it falls back to a placeholder
outside production and is mandatory in it. Leave it unset while working locally
and set it on the host once the webhook exists — a known default signing secret on
a real host would let anyone forge a revalidation request.

`SITE_URL` and `SITE_NAME` behave the same way, defaulting to
`http://localhost:3000` and `Site` locally; a production build requires both, and
`SITE_URL` must be HTTPS.

In development it's recommended to use the preview token which allows you to see unpublished (draft) data. In production, use the public token for NEXT_PUBLIC_STORYBLOK_TOKEN.

### 4. Run your project

Set the preview domain in <strong>Storyblok</strong> to `http://localhost:3000/`

```sh
# to run in developer mode
yarn dev # or npm run dev
```

```sh
# to build your project
yarn build # or npm run build
```

### 5. Storyblok sync

- `yarn sync` — pull component schemas from Storyblok and regenerate TS types.
- `yarn scaffold` — generate code stubs for any components missing a file
  (run after `yarn sync`; not part of it). Auto-detects the pulled component set
  under `.storyblok/components/` — no env var needed.

### 6. Quality checks

- `yarn check` — the full gate CI runs: formatting, ESLint, TypeScript, unit
  tests, and Storyblok type drift. Run this before opening a PR.
- Individual parts: `yarn format:check` (or `yarn format` to fix), `yarn lint`,
  `yarn typecheck`, `yarn test`, `yarn types:check`.

`yarn types:check` fails when the committed types under `.storyblok/types/` no
longer match the committed component schemas — run `yarn sync` and commit the
result.

CI additionally runs a production build without CMS access
(`STORYBLOK_SKIP_FETCH=true`), so builds stay green without Storyblok
credentials.

### 7. Setup preview mode

To enable preview mode you have to add two preview URLs in Storyblok:

**Preview**
`https://<my-url>/api/draft?secret=<API_SECRET>&slug=`

**Exit Preview**
`https://<my-url>/api/exit-draft?slug=`

`API_SECRET` is already set from step 3 — the app will not start without it.
It might be helpful for the end user to set the preview URL as default.

The `/api/draft` route validates the secret, confirms the story exists, enables
draft mode, and forwards **only** the `_storyblok*` params onward — the secret
never reaches the page URL. `data/` stories are rejected as non-previewable.

**Previewing a local server over an HTTPS tunnel:** Storyblok's editor needs
HTTPS, so a tunnel (`cloudflared tunnel --url http://localhost:3000`) is the usual
way to preview locally. Serve a production build through it —
`yarn build && yarn start` — **not `yarn dev`**. Next's HMR WebSocket cannot
upgrade through a tunnel (502 on `wss://`), so the dev server retries every second
and reloads the page, destroying the JS context before the Storyblok bridge
finishes loading. The symptom is a page that renders but never reflects edits,
which looks identical to a broken bridge. Note that with a production build,
browsing the tunnel URL directly returns 404 for unpublished stories — only the
`/api/draft` path shows them, which is exactly what the editor uses.

### 8. Webhook for revalidation

To revalidate pages after publishing in Storyblok, set up a Webhook pointing to:
`https://<my-url>/api/revalidate`

The endpoint verifies Storyblok's `webhook-signature` header (HMAC-SHA1). In the
Storyblok webhook settings, set the webhook secret to the same value as
`STORYBLOK_WEBHOOK_SECRET` in your env. Requests without a valid signature are
rejected. On a valid webhook the cache is flushed surgically: a content publish
busts that story's tag plus the links inventory (so a first publish shows up in
nav and sitemap), while a `data/` global, a structural change
(move/delete/unpublish), or a missing slug flushes the whole `storyblok` tag.

Note: publishes made through the Management API (scripts, migrations) do **not**
fire this webhook — Storyblok only sends it for editor actions. After scripted
content changes, call `/api/revalidate` yourself or redeploy.

### 9. Editor-managed redirects

Editors retire an old URL by adding an entry to the `data/redirects` story — no
deploy needed. Create a nestable `redirect` blok with three fields and a
`redirects` content type holding them in a `entries` bloks field:

| Field         | Type    | Notes                                          |
| ------------- | ------- | ---------------------------------------------- |
| `source`      | text    | Old path, e.g. `/impressum.html`. Exact match. |
| `destination` | text    | Path (`/impressum`) or absolute URL.           |
| `permanent`   | boolean | Unset/true → 308. False → 307.                 |

Resolution happens at the 404 boundary in `app/[[...slug]]/page.tsx`: when a
story is missing, `lib/redirects.ts` looks the path up and redirects. Live pages
never pay for the lookup, and the list rides the normal cache tags — publishing
`data/redirects` flushes the global `storyblok` tag like any other `data/` global.

Two consequences worth knowing:

- **The source must actually be gone.** A path that still resolves to a published
  story renders that story; the redirect never fires. Unpublish or delete first,
  then add the entry.
- **Query strings are preserved.** `/alt?utm_source=mail` → `/neu?utm_source=mail`.
  A destination carrying its own query keeps it and the incoming one is appended.

Pattern redirects (`/blog/:slug*`) are developer territory — add a standard Next
`redirects()` to `next.config.mjs`. The CMS story is for exact-path retirement.

### 10. Bootstrapping a new space

To give a fresh Storyblok space this template's structure and demo content:

```sh
yarn storyblok login -r eu   # choose "With email" — a personal access token will not work,
                              # it 403s on /internal_tags, which components push/pull call unconditionally
yarn setup:space --space <space-id> --yes
```

This pushes the committed baseline from `.storyblok/components/baseline/` and
`.storyblok/stories/baseline/`: a `page` content type with an SEO tab, a
`text_section` blok, and the `data/redirects` global with one example entry.

Afterwards, delete the Storyblok starter bloks (`feature`, `grid`, `teaser`) in
the UI — `components push` creates and updates but cannot delete.

The baseline bootstraps _new_ spaces; it does not govern existing ones. For a
space already in use, the Storyblok UI stays the source of truth and `yarn sync`
pulls its schema. `setup:space` refuses a target holding stories outside the
baseline set, so it cannot quietly overwrite a space in use; `--force` overrides
that, and should not be habitual.

#### Smoke-testing a bootstrapped space

`scripts/smoke.sh` checks a running dev server end to end — the page renders, rich
text produces a bold mark, an internal link, a `mailto:` link and an embedded blok,
and the CMS redirects fire with the query string preserved:

```sh
yarn dev
./scripts/smoke.sh                        # or ./scripts/smoke.sh http://localhost:3003
```

Baseline stories may be unpublished drafts — `next dev` reads drafts, so that is
fine. Preview editing in the visual editor is the one thing the script cannot
cover; check that by hand.

#### Which Storyblok credential does what

Three similar names, three different jobs. They are not interchangeable:

| Credential                       | Used for                                 | Supplied via                                     |
| -------------------------------- | ---------------------------------------- | ------------------------------------------------ |
| CLI session (OAuth, email login) | `components` / `stories` push and pull   | `storyblok login -r eu`, stored outside the repo |
| `STORYBLOK_MANAGEMENT_TOKEN`     | direct Management API reads, and deletes | `.env`                                           |
| `NEXT_PUBLIC_STORYBLOK_TOKEN`    | delivery reads from the app              | `.env`, validated by `lib/env.ts`                |

The management token is a personal access token: fine for reading and deleting,
but it cannot drive `components push`. Deleting a component is the one schema
operation the CLI cannot do at all, which is why removing the starter bloks above
is a manual step.

Setting a bare `STORYBLOK_TOKEN` in `.env` does nothing — the CLI only reads it
when `STORYBLOK_LOGIN` and `STORYBLOK_REGION` are set alongside it, and otherwise
uses the stored login session.

## Conventions

These rules keep the codebase predictable across components and contributors.

**Component registry**

- The registry key in `lib/storyblok.ts` must be the **exact snake_case technical name** from Storyblok (e.g. `privacy_bee`, `hero_section`). A one-character mismatch means the blok silently renders nothing.

**Component hierarchy**

- Pages are built as: `page` → `*Section` → `*Card`/`*Item`.
- One file per blok, PascalCase filename, under `components/nestables/` or `components/content_types/`.

**Whitelisting child bloks**

- Filter shared/reusable child bloks by Storyblok **tag** (`section`, `shared`, `richtext`) — tag-based filtering stays correct as new bloks are added. Enumerate parent-specific children explicitly (a one-off tag per parent isn't worth it).

**Field-name vocabulary**
Use these field names consistently across bloks:

- `headline` — heading text
- `eyebrow` — small label above the headline (a.k.a. kicker)
- `lead` / `text` — richtext intro or body copy
- `body` / `items` — nested blok arrays
- `image` / `images` — single or multiple asset fields
- `link` / `links` — CTA or navigation links
- `label` — button/link label
- `variant` / `theme` — option fields for visual variants
- `is*` / `has*` — boolean toggles (e.g. `is_full_width`, `has_background`)

**Globals and routing**

- Stories under `data/` are non-routable (excluded from sitemap and static params). They are fetched as globals (nav, footer, settings) via `lib/storyblok-api.ts`.

**Preview and live modes**

- `MODE` (`preview` | `live`) gates draft content and `noindex`. It's derived from `VERCEL_ENV` by default (non-prod Vercel deploys → `preview`; production / non-Vercel → `live`); set the `MODE` env var to override (e.g. a draft-on-prod review site). Local `next dev` always reads drafts regardless of `MODE`.
- The Storyblok bridge (live editing) is gated separately by the SDK (`isVisualEditor()`), **not** by `MODE` — it loads only inside the Storyblok editor iframe and never ships to the production bundle.

**Analytics**

- **Pirsch** (cookieless, no consent required) loads globally in the root layout via `<Pirsch />`. It uses `pirsch.js` with `id="pirschjs"`. In development it is skipped entirely.
- **PrivacyBee** is a Storyblok **blok** (registry key `privacy_bee`), not a global script. Editors place it on the pages that need the consent widget. It renders the `<privacybee-widget>` custom element via `widget.js`; the `website_id` comes from the blok's own field.

**SEO**

- Root `metadata` in `app/layout.tsx` sets the title template (`%s · Site`) and OpenGraph defaults (`OG_DEFAULTS` in `lib/config.ts`, spread into every override because Next replaces `openGraph` rather than merging it); per-page `generateMetadata` in `app/[[...slug]]/page.tsx` overrides title, description, canonical, and images per story. `JsonLd` (`components/seo/JsonLd.tsx`) emits Organization + WebSite structured data sitewide.

## Resources

- [Next.js docs](https://nextjs.org/docs/#setup)
- [Storyblok Tutorial](https://www.storyblok.com/tp/add-a-headless-cms-to-next-js-in-5-minutes)
- [Preview Mode](https://nextjs.org/docs/advanced-features/preview-mode)
