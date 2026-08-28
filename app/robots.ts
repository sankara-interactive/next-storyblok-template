import type { MetadataRoute } from 'next'
import { SITE_URL, isPreview } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  if (isPreview) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    // /api/md/ is the Markdown twin of a public page — carved back out of the
    // /api/ disallow so agents may crawl it.
    rules: { userAgent: '*', allow: ['/', '/api/md/'], disallow: '/api/' },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  }
}
