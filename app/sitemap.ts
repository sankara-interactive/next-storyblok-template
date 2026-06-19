import type { MetadataRoute } from 'next'
import { SITE_URL } from '../lib/config'
import { getAllLinks } from '../lib/storyblok-api'
import { sitemapPaths } from '../lib/sitemap'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const links = await getAllLinks()
  return sitemapPaths(links).map(path => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: new Date(),
  }))
}
