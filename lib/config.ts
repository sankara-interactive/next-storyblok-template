type Mode = 'preview' | 'live'

export const MODE: Mode = process.env.MODE === 'preview' ? 'preview' : 'live'
export const isPreview = MODE === 'preview'

export const SITE_URL = process.env.SITE_URL ?? 'http://localhost:3000'
export const SITE_NAME = process.env.SITE_NAME ?? 'Site'

/** Single cache tag for every Storyblok read; flushed on publish. */
export const STORYBLOK_CACHE_TAG = 'storyblok'

/** Top-level Storyblok folder holding non-routable global stories. */
export const DATA_PREFIX = 'data'
