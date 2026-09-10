import { describe, expect, it } from 'vitest'
import { sitemapPaths } from './sitemap'

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
