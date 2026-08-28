import { describe, expect, it, vi } from 'vitest'
import { renderSitemap, sitemapEntries, sitemapPaths } from './sitemap'

const links = {
  a: { slug: 'home', is_folder: false },
  b: { slug: 'about', is_folder: false },
  c: { slug: 'blog', is_folder: true },
  d: { slug: 'data/menu', is_folder: false },
  e: { slug: 'leistungen/seo', is_folder: false },
}

describe('sitemapPaths', () => {
  it('keeps public pages, drops folders/data, maps home to /', () => {
    expect(sitemapPaths(links).sort()).toEqual(['/', '/about', '/leistungen/seo'])
  })
})

describe('sitemapEntries', () => {
  it('emits one unprefixed entry per page while a single locale is configured', () => {
    expect(
      sitemapEntries(links)
        .map(e => e.path)
        .sort()
    ).toEqual(['/', '/about', '/leistungen/seo'])
  })

  it('carries no hreflang alternates at a single locale', () => {
    expect(sitemapEntries(links).every(e => e.alternates === undefined)).toBe(true)
  })
})

describe('renderSitemap', () => {
  it('renders absolute URLs', () => {
    expect(renderSitemap(sitemapEntries(links))).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
<url>
<loc>http://localhost:3000/</loc>
</url>
<url>
<loc>http://localhost:3000/about</loc>
</url>
<url>
<loc>http://localhost:3000/leistungen/seo</loc>
</url>
</urlset>
`
    )
  })

  it('escapes XML-significant characters in the URL', () => {
    expect(renderSitemap([{ path: '/suche?q=a&b' }])).toContain('?q=a&amp;b')
  })

  it('renders a valid empty document when nothing is published', () => {
    expect(renderSitemap([])).toContain('<urlset')
    expect(renderSitemap([])).not.toContain('<loc>')
  })

  it('renders hreflang links when an entry has alternates', () => {
    const xml = renderSitemap([
      { path: '/about', alternates: { de: '/about', fr: '/fr/about', 'x-default': '/about' } },
    ])
    expect(xml).toContain(
      '<xhtml:link rel="alternate" hreflang="fr" href="http://localhost:3000/fr/about" />'
    )
    expect(xml).toContain('hreflang="x-default"')
  })
})

// The multi-locale shape is dormant at LOCALES = ['de'], so it is exercised
// against a config that has a second locale — that is when it has to be right.
describe('with a second locale configured', () => {
  const withLocales = async () => {
    vi.resetModules()
    vi.doMock('./config', async () => ({
      ...(await vi.importActual<typeof import('./config')>('./config')),
      LOCALES: ['de', 'fr'] as const,
      DEFAULT_LOCALE: 'de',
    }))
    return import('./sitemap')
  }

  it('emits one URL per locale, prefixing only the non-default one', async () => {
    const { sitemapEntries } = await withLocales()
    expect(
      sitemapEntries(links)
        .map(e => e.path)
        .sort()
    ).toEqual(['/', '/about', '/fr', '/fr/about', '/fr/leistungen/seo', '/leistungen/seo'])
    vi.doUnmock('./config')
  })

  it('gives every entry the full hreflang set including x-default', async () => {
    const { sitemapEntries } = await withLocales()
    const about = sitemapEntries(links).find(e => e.path === '/fr/about')
    expect(about?.alternates).toEqual({
      de: '/about',
      fr: '/fr/about',
      'x-default': '/about',
    })
    vi.doUnmock('./config')
  })
})
