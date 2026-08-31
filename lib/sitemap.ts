import { isDataRoute } from './storyblok-routes'
import { SITE_URL } from './config'
import type { SbLink } from './storyblok-api'

export function sitemapPaths(links: Record<string, SbLink>): string[] {
  return Object.values(links)
    .filter(link => !link.is_folder && !isDataRoute(link.slug))
    .map(link => (link.slug === 'home' ? '/' : `/${link.slug}`))
}

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ponytail: no <lastmod> — cdn/links/ carries no published_at.
export function renderSitemap(paths: string[]): string {
  const urls = paths.map(
    path => `<url>\n<loc>${escape(new URL(path, SITE_URL).toString())}</loc>\n</url>`
  )

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    '</urlset>',
    '',
  ].join('\n')
}
