import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/config'
import { getAllLinks } from '@/lib/storyblok-api'
import { sitemapPaths } from '@/lib/sitemap'

// Metadata routes prerender to a static file that no tag or path purge reaches,
// so stories published between deploys never appeared. Dynamic keeps it a
// function; the links inventory still comes from the tagged data cache, which
// `force-dynamic` leaves alone (it only uncaches bare fetch() calls).
export const dynamic = 'force-dynamic'

// No lastModified: cdn/links/ carries no published_at, and a fabricated date
// on every URL makes crawlers discount the whole sitemap.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const links = await getAllLinks()
  return sitemapPaths(links).map(path => ({ url: new URL(path, SITE_URL).toString() }))
}
