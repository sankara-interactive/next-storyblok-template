import { DATA_PREFIX } from './config'

/** True if a slug is the data/ globals folder or a story inside it. */
export function isDataRoute(slug: string): boolean {
  return slug === DATA_PREFIX || slug.startsWith(`${DATA_PREFIX}/`)
}
