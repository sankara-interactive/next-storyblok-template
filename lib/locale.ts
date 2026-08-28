import { DEFAULT_LOCALE, LOCALES, SITE_URL } from './config'

/** URL path for a slug in a locale. The default locale is unprefixed. */
export function localePath(locale: string, slug: string): string {
  const path = slug === 'home' ? '' : `/${slug}`
  return locale === DEFAULT_LOCALE ? path || '/' : `/${locale}${path}`
}

/**
 * hreflang map for one story, plus x-default on the default locale.
 *
 * ponytail: every configured locale is assumed published. Storyblok can carry
 * per-locale `translated_slugs` and an unpublished-translation flag; wire those
 * in here (and in sitemapPaths) if a project needs per-language URLs or has
 * stories translated only partially.
 */
export function hreflangAlternates(slug: string): Record<string, string> | undefined {
  if (LOCALES.length < 2) return undefined
  const alternates: Record<string, string> = {}
  for (const locale of LOCALES) alternates[locale] = localePath(locale, slug)
  alternates['x-default'] = localePath(DEFAULT_LOCALE, slug)
  return alternates
}

/** Absolute URL, for the sitemap and markdown output. */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString()
