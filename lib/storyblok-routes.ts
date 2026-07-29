import { DATA_PREFIX, STORYBLOK_CACHE_TAG, storyTag } from './config'

/** True if a slug is the data/ globals folder or a story inside it. */
export function isDataRoute(slug: string): boolean {
  return slug === DATA_PREFIX || slug.startsWith(`${DATA_PREFIX}/`)
}

/** Webhook flush target: a content publish busts one story, anything else
 * (data/ global, structural action, missing slug) busts the global tag. */
export function revalidationTag(action?: string, fullSlug?: string): string {
  return action === 'published' && fullSlug && !isDataRoute(fullSlug)
    ? storyTag(fullSlug)
    : STORYBLOK_CACHE_TAG
}
