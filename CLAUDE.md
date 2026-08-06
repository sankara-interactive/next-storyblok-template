# next-storyblok-template

Next 16 (App Router, RSC) + Storyblok marketing-site template.

## Architecture
- **All Storyblok reads** go through `lib/storyblok-api.ts` (`server-only`). Live
  reads carry the global `STORYBLOK_CACHE_TAG`; each published story also carries a
  per-story tag (`storyTag(slug)` → `storyblok:<slug>`). Never call the SDK directly
  from a component.
- **Revalidation**: `/api/revalidate` verifies the webhook signature, then flushes
  surgically (`revalidationTags` in `lib/storyblok-routes.ts`): a plain content
  `published` busts `storyblok:<full_slug>` plus the links inventory
  (`storyblok:links` — a first publish adds a route only that tag can surface); a
  `data/` global, a structural action (unpublish/move/delete), or a missing slug
  flushes the whole `storyblok` tag. Tag-flush only works because every read is
  tagged. Management-API publishes do NOT fire the webhook — scripted content
  changes must call `/api/revalidate` (or redeploy) themselves.
- **Bridge** is handled by the SDK: `<StoryblokStory>` (in `app/[[...slug]]/page.tsx`)
  renders `StoryblokLiveEditing`, which self-gates on `isVisualEditor()` and
  dynamically loads the bridge only inside the Storyblok editor iframe — so it
  never ships in the production bundle. There is no `StoryblokProvider`; the SDK
  exports none, and one isn't needed (all bloks are server components).
- **Globals** live under `data/` and are non-routable (rejected by the page
  loader and excluded from sitemap/static params).
- **Redirects**: editor-owned exact-path retirement lives in `data/redirects` and
  resolves at the 404 boundary (`lib/redirects.ts`, called from the catch-all when
  `getStory` returns `null`), so live pages never pay for the lookup. A source
  path that still resolves to a published story never redirects. Pattern
  redirects stay in `next.config.mjs`.
- **Links**: resolve Storyblok link fields with `getHref` / `<SbLink>`
  (`lib/getHref.ts`, `components/helpers/SbLink.tsx`) — never hand-build hrefs.
- **MODE** (`preview`|`live`) gates draft content and `noindex`. Derived from
  `VERCEL_ENV` by default (non-prod Vercel deploys → `preview`; prod / non-Vercel →
  `live`); set the `MODE` env var explicitly to override (e.g. a draft-on-prod
  review site). Local `next dev` always reads drafts regardless of MODE (the
  `isDev` short-circuit in `resolveVersion`), so MODE only matters for deployed
  hosts. (The bridge is gated separately by the SDK's `isVisualEditor()` — see
  Bridge above.)
- **Environment**: app and server code reads `lib/env.ts` (`@t3-oss/env-nextjs` +
  Zod), never `process.env` — one access pattern, `env.X`, always typed, so nothing
  needs narrowing at the call site. Build-time config that loads outside the Next
  bundle is the exception and must use `process.env` directly:
  `next.config.mjs`, `storyblok.config.mjs`, `lib/redirects.mjs`, `scripts/`. `NEXT_PUBLIC_STORYBLOK_TOKEN`,
  `STORYBLOK_PREVIEW_TOKEN` and `API_SECRET` are required everywhere: a missing one
  fails at boot naming the variable. `SITE_URL`, `SITE_NAME` and
  `STORYBLOK_WEBHOOK_SECRET` default outside production and are mandatory in it —
  the webhook secret because it cannot be known before a deploy exists, and a
  known default HMAC secret on a real host would let anyone forge a revalidation
  request. `STORYBLOK_SKIP_FETCH=true` is a CI-only escape hatch making content
  reads return empty so a production build needs no CMS access; never set it on a
  deployed site.
- **Analytics**: Pirsch (cookieless, `pirsch.js` / `id="pirschjs"`) loads globally
  in the layout via `<Pirsch />` — skipped in development (`NODE_ENV === 'development'`).
  PrivacyBee is a **blok** (registry key `privacy_bee`) that renders `<privacybee-widget>`
  from `https://www.privacybee.ch/widget.js`; it is placed in page content, not the
  layout. Its `website_id` comes from the blok field — there is no global env var for it.
- **SEO**: structured data (Organization + WebSite JSON-LD) is emitted sitewide from
  `components/seo/JsonLd.tsx`; root `metadata` in `app/layout.tsx` provides title-template
  + OG defaults; per-page metadata in `app/[[...slug]]/page.tsx` overrides
  title/description/canonical/images. Next *replaces* `openGraph` rather than merging it,
  so every override spreads `OG_DEFAULTS` (`lib/config.ts`).

## Conventions
- Registry key = EXACT snake_case technical name (mismatch = silent no-render).
  snake_case keeps blok names consistent with Storyblok-native fields (`is_folder`,
  link/asset internals). Generated types stay PascalCase (`HeroSectionStoryblok`).
- Hierarchy: `page` → `*Section` → `*Card`/`*Item`. PascalCase files 1:1.
- Whitelist shared/reusable child bloks by tag (`section`/`shared`/`richtext`);
  enumerate parent-specific children explicitly (a one-off tag per parent isn't
  worth it).
- Field-name vocabulary (rules of thumb): `headline` (heading), `eyebrow` (kicker),
  `lead`/`text` (richtext), `body`/`items` (nested bloks), `image`/`images`,
  `link`/`links`, `label`, `variant`/`theme` (options), `is*`/`has*` (booleans).

## Workflow
- `yarn check` — the gate CI runs: formatting, ESLint, TypeScript, tests, and
  Storyblok type drift. Run it before opening a PR.
- `yarn sync` — pull schemas + regenerate types. Commit `components.json`.
- `yarn scaffold` — generate stubs for missing components (deliberate, separate).
- Schema source of truth = Storyblok UI; push back via the CLI/Management API
  only when authoring a blok in code (overwrites — coordinate).
- Agents: use the Storyblok Management API, not the MCP, for schema/content work.
- Never edit `.env*`; never commit on `main`.
