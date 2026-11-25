import { isDataRoute } from './storyblok-routes'
import { LOCALES } from './config'
import { hreflangAlternates, localePath } from './locale'
import type { SbLink } from './storyblok-api'

export type SitemapEntry = { path: string; alternates?: Record<string, string> }

/** Folder start pages arrive as `folder/`; their canonical has no trailing slash. */
export function routableSlugs(links: Record<string, SbLink>): string[] {
  return Object.values(links)
    .filter(link => !link.is_folder && !isDataRoute(link.slug))
    .map(link => link.slug.replace(/\/$/, ''))
}

/** Return routable slugs in the default locale for llms.txt and 404 responses. */
export function sitemapPaths(links: Record<string, SbLink>): string[] {
  return routableSlugs(links).map(slug => (slug === 'home' ? '/' : `/${slug}`))
}

/** One entry per locale URL, each carrying the full hreflang set. */
export function sitemapEntries(links: Record<string, SbLink>): SitemapEntry[] {
  return routableSlugs(links).flatMap(slug => {
    const alternates = hreflangAlternates(slug)
    return LOCALES.map(locale => ({ path: localePath(locale, slug), alternates }))
  })
}
