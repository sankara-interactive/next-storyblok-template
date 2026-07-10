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

Add the tokens and space ID from Storyblok and the API secret as environment variables:

```sh
STORYBLOK_SPACE_ID=<your-space-id>
NEXT_PUBLIC_STORYBLOK_TOKEN=<your-public-token>
STORYBLOK_PREVIEW_TOKEN=<your-preview-token>
API_SECRET=<a-strong-random-string-used-by-api-routes>
```

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

### 6. Setup preview mode

To enable preview mode you have to add two preview URLs in Storyblok:

**Preview**
`https://<my-url>/api/draft?secret=<API_SECRET>&slug=`

**Exit Preview**
`https://<my-url>/api/exit-draft?slug=`

Don't forget to add the secret as env-variable.
It might be helpful for the end user to set the preview URL as default.

### 7. Webhook for revalidation

To revalidate pages after publishing in Storyblok, set up a Webhook pointing to:
`https://<my-url>/api/revalidate`

The endpoint verifies Storyblok's `webhook-signature` header (HMAC-SHA1). In the
Storyblok webhook settings, set the webhook secret to the same value as
`STORYBLOK_WEBHOOK_SECRET` in your env. Requests without a valid signature are
rejected. On a valid webhook the cache is flushed surgically: a content publish
busts only that story's tag, while a `data/` global, a structural change
(move/delete/unpublish), or a missing slug flushes the whole `storyblok` tag
(which also covers nav, sitemap, and links).

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
- Root `metadata` in `app/layout.tsx` sets the title template (`%s · Site`) and OpenGraph defaults; per-page `generateMetadata` in `app/[...slug]/page.tsx` overrides title, description, canonical, and images per story. `JsonLd` (`components/seo/JsonLd.tsx`) emits Organization + WebSite structured data sitewide.

## Resources

- [Next.js docs](https://nextjs.org/docs/#setup)
- [Storyblok Tutorial](https://www.storyblok.com/tp/add-a-headless-cms-to-next-js-in-5-minutes)
- [Preview Mode](https://nextjs.org/docs/advanced-features/preview-mode)
