type Mode = 'preview' | 'live'

// Explicit MODE wins; otherwise derive from Vercel's deploy env. Non-prod Vercel
// deploys (preview/development) show drafts; production — or any non-Vercel host
// where VERCEL_ENV is unset — defaults to the safe `live`.
// Note: this only affects DEPLOYED hosts. Local `next dev` always reads draft
// content regardless of MODE, via the `isDev` short-circuit in resolveVersion
// (lib/storyblok-api.ts) — so the `live` fallback never hides drafts on localhost.
const explicitMode = process.env.MODE
export const MODE: Mode =
  explicitMode === 'preview' || explicitMode === 'live'
    ? explicitMode
    : process.env.VERCEL_ENV && process.env.VERCEL_ENV !== 'production'
      ? 'preview'
      : 'live'
export const isPreview = MODE === 'preview'

export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000'
export const SITE_NAME = process.env.SITE_NAME ?? 'Site'

/** Single cache tag for every Storyblok read; flushed on publish. */
export const STORYBLOK_CACHE_TAG = 'storyblok'

/** Top-level Storyblok folder holding non-routable global stories. */
export const DATA_PREFIX = 'data'
