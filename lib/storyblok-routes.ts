import { DATA_PREFIX, LINKS_CACHE_TAG, STORYBLOK_CACHE_TAG, storyTag } from './config'

/** True if a slug is the data/ globals folder or a story inside it. */
export function isDataRoute(slug: string): boolean {
  return slug === DATA_PREFIX || slug.startsWith(`${DATA_PREFIX}/`)
}

/**
 * Cache tags to flush for a Storyblok webhook. A content publish busts that
 * story plus the links inventory — a first publish adds a route only the links
 * tag can surface. Anything else (data/ global, unpublish/move/delete, missing
 * slug) flushes the global tag.
 *
 * Folder startpages arrive with a trailing slash but are read without one, so
 * the slug is normalized or the flush silently no-ops.
 */
export function revalidationTags(action?: string, fullSlug?: string): string[] {
  const slug = fullSlug?.replace(/\/+$/, '')
  if (action === 'published' && slug && !isDataRoute(slug)) {
    return [storyTag(slug), LINKS_CACHE_TAG]
  }
  return [STORYBLOK_CACHE_TAG]
}
