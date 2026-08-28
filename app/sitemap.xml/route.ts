import { addCacheTag } from '@vercel/functions'
import { SITEMAP_CDN_TAG } from '@/lib/config'
import { getAllLinks } from '@/lib/storyblok-api'
import { renderSitemap, sitemapPaths } from '@/lib/sitemap'

// Not the `sitemap.ts` metadata convention: that deploys as a static asset, and
// neither revalidateTag nor revalidatePath reaches it — stories published between
// deploys never appeared. force-dynamic keeps this a function; the CDN still caches.
export const dynamic = 'force-dynamic'

export async function GET() {
  const body = renderSitemap(sitemapPaths(await getAllLinks()))
  await addCacheTag(SITEMAP_CDN_TAG)

  return new Response(body, {
    headers: {
      'content-type': 'application/xml; charset=utf-8',
      // Held at the CDN until the webhook purges the tag; browsers never cache.
      'vercel-cdn-cache-control': 'public, max-age=31536000',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  })
}
