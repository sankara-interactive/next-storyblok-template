import { env } from './env'

type Mode = 'preview' | 'live'

// Explicit MODE wins; otherwise derive from Vercel's deploy env. Non-prod Vercel
// deploys (preview/development) show drafts; production — or any non-Vercel host
// where VERCEL_ENV is unset — defaults to the safe `live`.
// Note: this only affects DEPLOYED hosts. Local `next dev` always reads draft
// content regardless of MODE, via the `isDev` short-circuit in resolveVersion
// (lib/storyblok-api.ts) — so the `live` fallback never hides drafts on localhost.
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
