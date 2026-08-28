import { env } from './env'

type Mode = 'preview' | 'live'

// Explicit MODE wins, else non-prod VERCEL_ENV → preview; anything else → live.
// Deployed hosts only: `next dev` always reads drafts (isDev in storyblok-api).
const explicitMode = env.MODE
export const MODE: Mode =
  explicitMode === 'preview' || explicitMode === 'live'
    ? explicitMode
    : env.VERCEL_ENV && env.VERCEL_ENV !== 'production'
      ? 'preview'
      : 'live'
export const isPreview = MODE === 'preview'

// Single source of truth for locales; i18n/routing.ts consumes these.
export const LOCALES = ['de'] as const
export const DEFAULT_LOCALE: (typeof LOCALES)[number] = 'de'

/** Regional variants for `<html lang>` and og:locale; hreflang stays language-only. */
export const HTML_LANG: Record<string, string> = { de: 'de-CH', fr: 'fr-CH', it: 'it-CH', en: 'en' }
export const OG_LOCALE: Record<string, string> = { de: 'de_CH', fr: 'fr_CH', it: 'it_CH', en: 'en' }

export const SITE_URL = env.SITE_URL
export const SITE_NAME = env.SITE_NAME

/** Next replaces `openGraph` wholesale instead of merging — spread this into every override. */
export const OG_DEFAULTS = {
  siteName: SITE_NAME,
  locale: OG_LOCALE[DEFAULT_LOCALE] ?? DEFAULT_LOCALE,
  type: 'website',
} as const

/** Global cache tag on every Storyblok read; flushed for globals/structural changes. */
export const STORYBLOK_CACHE_TAG = 'storyblok'

/** Per-story cache tag, so a single content publish busts only that story. */
export const storyTag = (slug: string) => `${STORYBLOK_CACHE_TAG}:${slug}`

/** Tag on the links inventory (nav, sitemap, static params). Flushed on every
 * publish: a first publish adds a route the per-story tag can't cover. */
export const LINKS_CACHE_TAG = `${STORYBLOK_CACHE_TAG}:links`

/** Top-level Storyblok folder holding non-routable global stories. */
export const DATA_PREFIX = 'data'

/** Vercel CDN cache tag on /sitemap.xml — reached by `invalidateByTag`, not Next tags. */
export const SITEMAP_CDN_TAG = 'sitemap'
