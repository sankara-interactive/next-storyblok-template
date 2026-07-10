# next-storyblok-template

Next 16 (App Router, RSC) + Storyblok marketing-site template.

## Architecture
- **All Storyblok reads** go through `lib/storyblok-api.ts` (`server-only`). Live
  reads carry the global `STORYBLOK_CACHE_TAG`; each published story also carries a
  per-story tag (`storyTag(slug)` → `storyblok:<slug>`). Never call the SDK directly
  from a component.
- **Revalidation**: `/api/revalidate` verifies the webhook signature, then flushes
  surgically (`revalidationTag` in `lib/storyblok-routes.ts`): a plain content
  `published` busts only `storyblok:<full_slug>`; a `data/` global, a structural
  action (unpublish/move/delete), or a missing slug flushes the whole `storyblok`
  tag (nav/sitemap/links are global-tagged). Tag-flush only works because every
  read is tagged.
- **Bridge** is handled by the SDK: `<StoryblokStory>` (in `app/[...slug]/page.tsx`)
  renders `StoryblokLiveEditing`, which self-gates on `isVisualEditor()` and
  dynamically loads the bridge only inside the Storyblok editor iframe — so it
  never ships in the production bundle. There is no `StoryblokProvider`; the SDK
  exports none, and one isn't needed (all bloks are server components).
- **Globals** live under `data/` and are non-routable (rejected by the page
  loader and excluded from sitemap/static params). `Header`/`Footer`
  (`components/layout/`) read `data/header`/`data/footer` via `getStory` with
  hardcoded fallbacks, so they render before those stories are authored.
- **Starter UI implementations**: the current `Button`, `Header`, and `Footer`
  establish working CMS and rendering patterns, but their hand-written content
  types, component APIs, and styling are provisional. The enhancement roadmap
  replaces them with generated schemas and thin Storyblok adapters around the
  future Sankara UI package. Do not treat their current visual API as the shared
  design-system contract.
- **Links**: resolve Storyblok link fields with `getHref` / `<SbLink>`
  (`lib/getHref.ts`, `components/helpers/SbLink.tsx`) — never hand-build hrefs.
- **MODE** (`preview`|`live`) gates draft content and `noindex`. Derived from
  `VERCEL_ENV` by default (non-prod Vercel deploys → `preview`; prod / non-Vercel →
  `live`); set the `MODE` env var explicitly to override (e.g. a draft-on-prod
  review site). Local `next dev` always reads drafts regardless of MODE (the
  `isDev` short-circuit in `resolveVersion`), so MODE only matters for deployed
  hosts. (The bridge is gated separately by the SDK's `isVisualEditor()` — see
  Bridge above.)
- **Analytics**: Pirsch (cookieless, `pirsch.js` / `id="pirschjs"`) loads globally
  in the layout via `<Pirsch />` — skipped in development (`NODE_ENV === 'development'`).
  PrivacyBee is a **blok** (registry key `privacy_bee`) that renders `<privacybee-widget>`
  from `https://www.privacybee.ch/widget.js`; it is placed in page content, not the
  layout. Its `website_id` comes from the blok field — there is no global env var for it.
- **SEO**: structured data (Organization + WebSite JSON-LD) is emitted sitewide from
  `components/seo/JsonLd.tsx`; root `metadata` in `app/layout.tsx` provides title-template
  + OG defaults; per-page metadata in `app/[...slug]/page.tsx` overrides title/description/canonical/images.

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
- `yarn sync` — pull schemas + regenerate types. Commit `components.json`.
- `yarn scaffold` — generate stubs for missing components (deliberate, separate).
- Schema source of truth = Storyblok UI; push back via the CLI/Management API
  only when authoring a blok in code (overwrites — coordinate).
- Agents: use the Storyblok Management API, not the MCP, for schema/content work.
- Never edit `.env*`; never commit on `main`.
