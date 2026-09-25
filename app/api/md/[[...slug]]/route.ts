import { DEFAULT_LOCALE, LOCALES, SITE_URL } from '@/lib/config'
import { absoluteUrl, localePath } from '@/lib/locale'
import { getAllLinks, getStory } from '@/lib/storyblok-api'
import { isDataRoute } from '@/lib/storyblok-routes'
import { sitemapPaths } from '@/lib/sitemap'
import { storyToMarkdown } from '@/lib/story-markdown'
import type { ContentType } from '@/app/[locale]/[[...slug]]/page'

export const revalidate = 3600

const markdown = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
      // Keep Markdown and HTML variants separate in shared caches.
      vary: 'Accept',
    },
  })

function splitLocale(segments: string[]): { locale: string; slug: string } {
  const [first, ...rest] = segments
  const hasLeadingLocale = !!first && (LOCALES as readonly string[]).includes(first)
  const locale = hasLeadingLocale ? first : DEFAULT_LOCALE
  const parts = hasLeadingLocale ? rest : segments
  return {
    locale,
    slug: parts.length ? parts.join('/') : 'home',
  }
}

/** Return a Markdown 404 response with site navigation. */
async function notFoundBody(): Promise<string> {
  const paths = sitemapPaths(await getAllLinks()).sort()
  return [
    '# Not found',
    'No page exists at this path. Available entry points:',
    `- [llms.txt](${absoluteUrl('/llms.txt')}) — what this site covers`,
    `- [sitemap.xml](${absoluteUrl('/sitemap.xml')}) — every URL`,
    '',
    '## All pages',
    paths.map(p => `- ${absoluteUrl(p)}`).join('\n'),
  ].join('\n\n')
}

export async function GET(_req: Request, props: { params: Promise<{ slug?: string[] }> }) {
  const { slug: segments } = await props.params
  const { locale, slug } = splitLocale(segments ?? [])

  // `data/` globals are not routable.
  if (isDataRoute(slug)) return markdown(await notFoundBody(), 404)

  const story = await getStory<ContentType>(slug, locale)
  if (!story) return markdown(await notFoundBody(), 404)

  return markdown(storyToMarkdown(story, new URL(localePath(locale, ''), SITE_URL).toString()))
}
