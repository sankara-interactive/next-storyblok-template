import { DEFAULT_LOCALE, LOCALES, SITE_URL } from './config'

/** URL path for a slug in a locale. The default locale is unprefixed. */
export function localePath(locale: string, slug: string): string {
  const path = slug === 'home' ? '' : `/${slug}`
  return locale === DEFAULT_LOCALE ? path || '/' : `/${locale}${path}`
}

// ponytail: assumes every configured locale is published. Wire Storyblok's
// `translated_slugs` in here for per-language URLs or partial translations.
export function hreflangAlternates(slug: string): Record<string, string> | undefined {
  if (LOCALES.length < 2) return undefined
  const alternates: Record<string, string> = {}
  for (const locale of LOCALES) alternates[locale] = localePath(locale, slug)
  alternates['x-default'] = localePath(DEFAULT_LOCALE, slug)
  return alternates
}

/** Absolute URL, for the sitemap and markdown output. */
export const absoluteUrl = (path: string) => new URL(path, SITE_URL).toString()
