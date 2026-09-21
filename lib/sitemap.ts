import { isDataRoute } from './storyblok-routes'
import { LOCALES } from './config'
import { hreflangAlternates, localePath } from './locale'
import type { SbLink } from './storyblok-api'

export type SitemapEntry = { path: string; alternates?: Record<string, string> }

/** Routable slugs, default locale only — the inventory llms.txt and the 404 use. */
export function sitemapPaths(links: Record<string, SbLink>): string[] {
  return Object.values(links)
    .filter(link => !link.is_folder && !isDataRoute(link.slug))
    .map(link => (link.slug === 'home' ? '/' : `/${link.slug}`))
}

/** One entry per locale URL, each carrying the full hreflang set. */
export function sitemapEntries(links: Record<string, SbLink>): SitemapEntry[] {
  const slugs = Object.values(links)
    .filter(link => !link.is_folder && !isDataRoute(link.slug))
    .map(link => link.slug)

  return slugs.flatMap(slug => {
    const alternates = hreflangAlternates(slug)
    return LOCALES.map(locale => ({ path: localePath(locale, slug), alternates }))
  })
}
