import { SITE_URL } from '@/lib/config'
import { getAllLinks, getStory } from '@/lib/storyblok-api'
import { isDataRoute } from '@/lib/storyblok-routes'
import { sitemapPaths } from '@/lib/sitemap'
import { storyToMarkdown } from '@/lib/story-markdown'
import type { ContentType } from '@/app/[[...slug]]/page'

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

/** A 404 an agent can recover from: where the map is, and every page on it. */
async function notFoundBody(): Promise<string> {
  const paths = sitemapPaths(await getAllLinks()).sort()
  return [
    '# Not found',
    'No page exists at this path. Available entry points:',
    `- [llms.txt](${new URL('/llms.txt', SITE_URL)}) — what this site covers`,
    `- [sitemap.xml](${new URL('/sitemap.xml', SITE_URL)}) — every URL`,
    '',
    '## All pages',
    paths.map(p => `- ${new URL(p, SITE_URL)}`).join('\n'),
  ].join('\n\n')
}

export async function GET(_req: Request, props: { params: Promise<{ slug?: string[] }> }) {
  const { slug: segments } = await props.params
  const slug = segments?.length ? segments.join('/') : 'home'

  // `data/` globals are non-routable, exactly as in the page loader.
  if (isDataRoute(slug)) return markdown(await notFoundBody(), 404)

  const story = await getStory<ContentType>(slug)
  if (!story) return markdown(await notFoundBody(), 404)

  return markdown(storyToMarkdown(story, SITE_URL))
}
