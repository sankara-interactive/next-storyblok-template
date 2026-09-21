import type { MetadataRoute } from 'next'
import { SITE_URL, isPreview } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  if (isPreview) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    // /api/md/ is a public page's Markdown twin — carved back out of the /api/ disallow.
    rules: { userAgent: '*', allow: ['/', '/api/md/'], disallow: '/api/' },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  }
}
