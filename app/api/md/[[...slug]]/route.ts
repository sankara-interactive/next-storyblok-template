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
      // What a shared cache would otherwise conflate with the HTML at this URL.
      vary: 'Accept',
    },
  })

/** Splits a leading locale segment off the path, mirroring `localePrefix: 'as-needed'`. */
function splitLocale(segments: string[]): { locale: string; slug: string } {
  const [first, ...rest] = segments
  const isLocale = first !== DEFAULT_LOCALE && (LOCALES as readonly string[]).includes(first)
  const parts = isLocale ? rest : segments
  return {
    locale: isLocale ? first : DEFAULT_LOCALE,
    slug: parts.length ? parts.join('/') : 'home',
  }
}

/** A 404 an agent can recover from: where the map is, and every page on it. */
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

  // `data/` globals are non-routable, exactly as in the page loader.
  if (isDataRoute(slug)) return markdown(await notFoundBody(), 404)

  const story = await getStory<ContentType>(slug, locale)
  if (!story) return markdown(await notFoundBody(), 404)

  return markdown(storyToMarkdown(story, new URL(localePath(locale, ''), SITE_URL).toString()))
}
