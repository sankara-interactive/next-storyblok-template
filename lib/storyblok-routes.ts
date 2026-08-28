import {
  DATA_PREFIX,
  DEFAULT_LOCALE,
  LINKS_CACHE_TAG,
  LOCALES,
  STORYBLOK_CACHE_TAG,
  storyTag,
} from './config'

/** True if a slug is the data/ globals folder or a story inside it. */
export function isDataRoute(slug: string): boolean {
  return slug === DATA_PREFIX || slug.startsWith(`${DATA_PREFIX}/`)
}

/**
 * True if the webhook slug is a non-default-locale one (`fr/accueil`). Storyblok
 * sends the translated slug, which matches no cache tag — reads are tagged with
 * the default-language slug — so a surgical flush would invalidate nothing.
 */
export function isTranslatedSlug(slug: string): boolean {
  const first = slug.split('/')[0]
  return first !== DEFAULT_LOCALE && (LOCALES as readonly string[]).includes(first)
}

/**
 * Cache tags to flush for a Storyblok webhook. A content publish busts that
 * story plus the links inventory — a first publish adds a route only the links
 * tag can surface. Anything else (data/ global, unpublish/move/delete, missing
 * slug, non-default-locale publish) flushes the global tag.
 *
 * Folder startpages arrive with a trailing slash but are read without one, so
 * the slug is normalized or the flush silently no-ops.
 */
export function revalidationTags(action?: string, fullSlug?: string): string[] {
  const slug = fullSlug?.replace(/\/+$/, '')
  if (action === 'published' && slug && !isDataRoute(slug) && !isTranslatedSlug(slug)) {
    return [storyTag(slug), LINKS_CACHE_TAG]
  }
  return [STORYBLOK_CACHE_TAG]
}
