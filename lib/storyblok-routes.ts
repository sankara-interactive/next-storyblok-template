import { DATA_PREFIX, STORYBLOK_CACHE_TAG, storyTag } from './config'

/** True if a slug is the data/ globals folder or a story inside it. */
export function isDataRoute(slug: string): boolean {
  return slug === DATA_PREFIX || slug.startsWith(`${DATA_PREFIX}/`)
}

/**
 * Cache tag to flush for a Storyblok webhook. A plain content publish busts only
 * that story; anything else — a `data/` global, a structural action
 * (unpublish/move/delete), or a missing slug — can affect nav/sitemap/links and
 * flushes the global tag.
 */
export function revalidationTag(action?: string, fullSlug?: string): string {
  return action === 'published' && fullSlug && !isDataRoute(fullSlug)
    ? storyTag(fullSlug)
    : STORYBLOK_CACHE_TAG
}
