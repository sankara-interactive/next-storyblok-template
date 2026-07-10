import { isDataRoute } from './storyblok-routes'
import type { SbLink } from './storyblok-api'

export function sitemapPaths(links: Record<string, SbLink>): string[] {
  const paths: string[] = []
  for (const link of Object.values(links)) {
    if (link.is_folder || isDataRoute(link.slug)) continue
    paths.push(link.slug === 'home' ? '/' : `/${link.slug}`)
  }
  return paths
}
