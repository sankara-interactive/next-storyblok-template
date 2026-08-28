import { addCacheTag } from '@vercel/functions'
import { SITE_NAME, SITE_URL, SITEMAP_CDN_TAG } from '@/lib/config'
import { getAllLinks } from '@/lib/storyblok-api'
import { sitemapPaths } from '@/lib/sitemap'

// Same inventory and CDN tag as sitemap.xml, so one webhook purge covers both.
export const dynamic = 'force-dynamic'

export async function GET() {
  const paths = sitemapPaths(await getAllLinks()).sort()
  const url = (path: string) => new URL(path, SITE_URL).toString()

  const body = [
    `# ${SITE_NAME}`,
    '',
    `> ${SITE_NAME} — see the pages below for what this site actually covers.`,
    '',
    '## How to read this site',
    '',
    'Every page is available as Markdown at its own URL: send',
    '`Accept: text/markdown` and you get the page as Markdown instead of HTML.',
    `The full URL list is at ${url('/sitemap.xml')}.`,
    '',
    '## Pages',
    '',
    paths.map(path => `- [${path}](${url(path)})`).join('\n'),
    '',
  ].join('\n')

  await addCacheTag(SITEMAP_CDN_TAG)

  return new Response(body, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'vercel-cdn-cache-control': 'public, max-age=31536000',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  })
}
