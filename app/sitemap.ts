import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/locale'
import { getAllLinks } from '@/lib/storyblok-api'
import { sitemapEntries } from '@/lib/sitemap'

// Keep this route dynamic so tag and path purges reach the generated response.
// The links inventory remains in the tagged data cache.
export const dynamic = 'force-dynamic'

// No lastModified: cdn/links/ does not provide published_at.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return sitemapEntries(await getAllLinks()).map(entry => ({
    url: absoluteUrl(entry.path),
    ...(entry.alternates && {
      alternates: {
        languages: Object.fromEntries(
          Object.entries(entry.alternates).map(([lang, href]) => [lang, absoluteUrl(href)])
        ),
      },
    }),
  }))
}
