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
- **Sitemap**: `app/sitemap.xml/route.ts`, deliberately NOT the `sitemap.ts`
  metadata convention — that deploys as a static asset, and neither
  `revalidateTag` nor `revalidatePath` reaches it, so stories published between
  deploys never appear. `force-dynamic` keeps it a function; the rendered XML is
  held at the edge under `Vercel-CDN-Cache-Control` and a Vercel CDN cache tag
  (`SITEMAP_CDN_TAG`), which the webhook purges via `invalidateByTag` — Vercel's
  tag namespace, not Next's, and the only thing that reaches the XML. The webhook
  also hard-expires `storyblok:links` (`{ expire: 0 }`, not `'max'`): `'max'` only
  marks it stale, so the first crawler after a purge could read pre-publish links
  and have that XML cached at the edge for a year. Off Vercel the purge is a
  no-op and is caught, never failing the webhook.
- **Agent readiness**: pages are also served as Markdown. `proxy.ts` negotiates
  `Accept` (`lib/accept.ts`, RFC 9110 — most specific range wins, so
  `text/markdown;q=0, */*` refuses markdown) and rewrites a markdown request to
  `app/api/md/[[...slug]]`; a client accepting neither type gets 406.
  `text/x-component` counts as HTML so Server Actions and RSC navigation are
  never negotiated. `lib/story-markdown.ts` walks the blok tree by the
  **field-name vocabulary below** rather than mapping components, so a new blok
  that follows the vocabulary needs no code there — one that invents field names
  renders as an empty section. `/llms.txt` shares the sitemap's inventory and CDN
  tag. `Vary: Accept` is set on the Markdown response only: Next overwrites
  `vary` with its RSC list on every page response, so it cannot be set on the
  HTML variant — harmless, because the proxy runs before the CDN cache lookup.
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
  `components/seo/JsonLd.tsx`; root `metadata` in `app/layout.tsx` provides the
  title-template and OG defaults; per-page metadata in `app/[[...slug]]/page.tsx`
  overrides title/description/canonical/images. Next _replaces_ `openGraph` rather
  than merging it, so every override spreads `OG_DEFAULTS` (`lib/config.ts`).

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
- `yarn setup:space --space <id> --yes` — bootstrap a **new** space from the
  committed baseline (`.storyblok/{components,stories}/baseline/`). It refuses a
  space holding stories outside that baseline; `--force` overrides. Never point it
  at a space in use. Existing spaces stay UI-driven — this does not govern them.
- Schema source of truth = Storyblok UI; push back via the CLI/Management API
  only when authoring a blok in code (overwrites — coordinate).
- **Credentials, three of them, not interchangeable.** The CLI session
  (`storyblok login -r eu`, _email_ method) drives `components`/`stories`
  push and pull — a personal access token cannot, because those commands call
  `/internal_tags` unconditionally and it 403s there. `STORYBLOK_MANAGEMENT_TOKEN`
  is that personal token, for direct Management API reads and deletes.
  `NEXT_PUBLIC_STORYBLOK_TOKEN` is the delivery token the app reads via
  `lib/env.ts`. A lone `STORYBLOK_TOKEN` in `.env` does nothing: the CLI reads it
  only with `STORYBLOK_LOGIN` and `STORYBLOK_REGION` set too.
- Agents: prefer the CLI for schema and content writes (it uses the session);
  use the Management API for read-back verification and for deletes, which the
  CLI cannot do — `components push` creates and updates only. Not the MCP.
- Verify server-side, not by exit status: the Storyblok CLI does not set a
  non-zero exit code on failure, and reports "Updated" for components it just
  created. Read the CLI's `reports/<space>/*.json` `status`, or pull and inspect.
- Never edit `.env*`; never commit on `main`.
