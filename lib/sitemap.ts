import { isDataRoute } from './storyblok-routes'
import { LOCALES, SITE_URL } from './config'
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

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ponytail: no <lastmod> — cdn/links/ carries no published_at.
export function renderSitemap(entries: SitemapEntry[]): string {
  const absolute = (path: string) => escape(new URL(path, SITE_URL).toString())
  const urls = entries.map(entry => {
    const lines = [`<loc>${absolute(entry.path)}</loc>`]
    for (const [lang, href] of Object.entries(entry.alternates ?? {})) {
      lines.push(`<xhtml:link rel="alternate" hreflang="${lang}" href="${absolute(href)}" />`)
    }
    return `<url>\n${lines.join('\n')}\n</url>`
  })

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}
