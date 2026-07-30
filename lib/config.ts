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

export const SITE_URL = env.SITE_URL
export const SITE_NAME = env.SITE_NAME

/** Global cache tag on every Storyblok read; flushed for globals/structural changes. */
export const STORYBLOK_CACHE_TAG = 'storyblok'

/** Per-story cache tag, so a single content publish busts only that story. */
export const storyTag = (slug: string) => `${STORYBLOK_CACHE_TAG}:${slug}`

/** Top-level Storyblok folder holding non-routable global stories. */
export const DATA_PREFIX = 'data'
