import StoryblokClient from 'storyblok-js-client'

/** Map Storyblok redirect entries to Next redirect objects; drop invalid ones. */
export function toNextRedirects(entries) {
  if (!Array.isArray(entries)) return []
  return entries
    .filter(e => e && typeof e.source === 'string' && typeof e.destination === 'string')
    .map(e => ({
      source: e.source,
      destination: e.destination,
      permanent: e.permanent !== false,
    }))
}

/** Fetch the data/redirects story at build time; never throw (return []). */
export async function fetchRedirects() {
  if (process.env.STORYBLOK_SKIP_FETCH === 'true') return []
  const token = process.env.NEXT_PUBLIC_STORYBLOK_TOKEN
  if (!token) return []
  try {
    const sb = new StoryblokClient({ accessToken: token })
    const { data } = await sb.get('cdn/stories/data/redirects', { version: 'published' })
    return toNextRedirects(data?.story?.content?.entries)
  } catch {
    return []
  }
}
