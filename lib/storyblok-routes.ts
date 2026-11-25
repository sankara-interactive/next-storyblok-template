import {
  DATA_PREFIX,
  DEFAULT_LOCALE,
  LINKS_CACHE_TAG,
  LOCALES,
  STORYBLOK_CACHE_TAG,
  storyTag,
} from './config'

export function isDataRoute(slug: string): boolean {
  return slug === DATA_PREFIX || slug.startsWith(`${DATA_PREFIX}/`)
}

/** A translated webhook slug does not match the default-language cache tag. */
export function isTranslatedSlug(slug: string): boolean {
  const first = slug.split('/')[0]
  return first !== DEFAULT_LOCALE && (LOCALES as readonly string[]).includes(first)
}

// A content publish busts that story plus the links inventory; anything else
// flushes the global tag. Folder startpages arrive with a trailing slash.
export function revalidationTags(action?: string, fullSlug?: string): string[] {
  const slug = fullSlug?.replace(/\/+$/, '')
  if (action === 'published' && slug && !isDataRoute(slug) && !isTranslatedSlug(slug)) {
    return [storyTag(slug), LINKS_CACHE_TAG]
  }
  return [STORYBLOK_CACHE_TAG]
}
