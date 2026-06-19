/** Returns a query string of only the Storyblok bridge params (never secret/slug). */
export function bridgeParams(searchParams: URLSearchParams): string {
  const out = new URLSearchParams()
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('_storyblok')) out.append(key, value)
  }
  return out.toString()
}
