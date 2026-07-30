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
  return entries
    .filter(e => e && typeof e.source === 'string' && typeof e.destination === 'string')
    .map(e => ({
      source: normalize(e.source.trim()),
      destination: e.destination.trim(),
      permanent: e.permanent !== false,
    }))
}

export function findRedirect(entries: RedirectEntry[], pathname: string): RedirectEntry | null {
  const target = normalize(pathname)
  return entries.find(entry => entry.source === target) ?? null
}

/** Carry the incoming query onto the destination; a destination's own query wins. */
export function withQuery(destination: string, query: string): string {
  if (!query) return destination
  return destination.includes('?') ? `${destination}&${query}` : `${destination}?${query}`
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
