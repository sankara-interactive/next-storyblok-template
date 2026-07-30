import 'server-only'
import { DATA_PREFIX } from './config'
import { getStory } from './storyblok-api'

export type RedirectEntry = {
  source: string
  destination: string
  permanent: boolean
}

/** A trailing slash or a missing leading one is an editor typo, not a distinct path. */
function normalize(path: string): string {
  const withLeading = path.startsWith('/') ? path : `/${path}`
  return withLeading.length > 1 ? withLeading.replace(/\/+$/, '') : withLeading
}

export function toRedirectEntries(entries: unknown): RedirectEntry[] {
  if (!Array.isArray(entries)) return []
  return entries.flatMap(entry => {
    if (!entry || typeof entry.source !== 'string' || typeof entry.destination !== 'string') {
      return []
    }
    const source = entry.source.trim()
    const destination = entry.destination.trim()
    // A blank source would normalize to '/' and claim the homepage; a blank
    // destination would redirect onto the current URL.
    if (!source || !destination) return []
    return [{ source: normalize(source), destination, permanent: entry.permanent !== false }]
  })
}

export function findRedirect(entries: RedirectEntry[], pathname: string): RedirectEntry | null {
  const target = normalize(pathname)
  return entries.find(entry => entry.source === target) ?? null
}

/** Carry the incoming query onto the destination, ahead of any fragment. */
export function withQuery(destination: string, query: string): string {
  if (!query) return destination
  const hash = destination.indexOf('#')
  const path = hash === -1 ? destination : destination.slice(0, hash)
  const fragment = hash === -1 ? '' : destination.slice(hash)
  return `${path}${path.includes('?') ? '&' : '?'}${query}${fragment}`
}

export function queryString(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) value.forEach(entry => search.append(key, entry))
    else if (value !== undefined) search.append(key, value)
  }
  return search.toString()
}

/** Read at the 404 boundary only, so live pages never pay for the lookup. */
export async function getRedirects(): Promise<RedirectEntry[]> {
  const story = await getStory<{ entries?: unknown }>(`${DATA_PREFIX}/redirects`)
  return toRedirectEntries(story?.content?.entries)
}
