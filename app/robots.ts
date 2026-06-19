import type { MetadataRoute } from 'next'
import { SITE_URL, isPreview } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  if (isPreview) {
    return { rules: { userAgent: '*', disallow: '/' } }
  }
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/api/' },
    sitemap: new URL('/sitemap.xml', SITE_URL).toString(),
  }
}
