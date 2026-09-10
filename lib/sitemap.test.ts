import { describe, expect, it, vi } from 'vitest'
import { sitemapEntries, sitemapPaths } from './sitemap'

const links = {
  a: { slug: 'home', is_folder: false },
  b: { slug: 'about', is_folder: false },
  c: { slug: 'blog', is_folder: true },
  d: { slug: 'data/menu', is_folder: false },
  e: { slug: 'leistungen/seo', is_folder: false },
}

describe('sitemapPaths', () => {
  it('keeps public pages, drops folders/home/data', () => {
    const links = {
      a: { slug: 'home', is_folder: false },
      b: { slug: 'about', is_folder: false },
      c: { slug: 'blog', is_folder: true },
      d: { slug: 'data/menu', is_folder: false },
      e: { slug: 'leistungen/seo', is_folder: false },
    }
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
