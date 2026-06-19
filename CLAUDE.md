# next-storyblok-template

Next 16 (App Router, RSC) + Storyblok marketing-site template.

## Architecture
- **All Storyblok reads** go through `lib/storyblok-api.ts` (`server-only`). Live
  reads are cache-tagged with `STORYBLOK_CACHE_TAG`; never call the SDK directly
  from a component.
- **Revalidation**: `/api/revalidate` verifies the webhook signature and flushes
  the single `storyblok` tag. Tag-flush only works because every read is tagged.
- **Bridge** loads only in preview (`StoryblokProvider` gated on draft mode). It
  must never ship in the production bundle.
- **Globals** live under `data/` and are non-routable (rejected by the page
  loader and excluded from sitemap/static params).
- **MODE** (`preview`|`live`) gates draft content, `noindex`, and the bridge.

## Conventions
- Registry key = EXACT camelCase technical name (mismatch = silent no-render).
- Hierarchy: `page` → `*Section` → `*Card`/`*Item`. PascalCase files 1:1.
- Whitelist child bloks by tag (`section`/`shared`/`richtext`), never enumerate.
- Field-name vocabulary (rules of thumb): `headline` (heading), `eyebrow`,
  `lead`/`text` (richtext), `body`/`items` (nested bloks), `image`/`images`,
  `link`/`links`, `label`, `variant`/`theme` (options), `is*`/`has*` (booleans).

## Workflow
- `yarn sync` — pull schemas + regenerate types. Commit `components.json`.
- `yarn scaffold` — generate stubs for missing components (deliberate, separate).
- Schema source of truth = Storyblok UI; push back via the CLI/Management API
  only when authoring a blok in code (overwrites — coordinate).
- Agents: use the Storyblok Management API, not the MCP, for schema/content work.
- Never edit `.env*`; never commit on `main`.
