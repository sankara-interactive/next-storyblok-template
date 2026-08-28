import { describe, expect, it } from 'vitest'
import { renderSitemap, sitemapPaths } from './sitemap'

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

describe('renderSitemap', () => {
  it('renders absolute URLs against SITE_URL', () => {
    expect(renderSitemap(sitemapPaths(links))).toBe(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
    expect(renderSitemap(['/suche?q=a&b'])).toContain('?q=a&amp;b')
  })

  it('renders a valid empty document when nothing is published', () => {
    expect(renderSitemap([])).toContain('<urlset')
    expect(renderSitemap([])).not.toContain('<loc>')
  })
})
