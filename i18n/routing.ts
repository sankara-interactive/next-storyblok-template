import { defineRouting } from 'next-intl/routing'
import { DEFAULT_LOCALE, LOCALES } from '@/lib/config'

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // The default locale is unprefixed: `/about`, not `/de/about`.
  localePrefix: 'as-needed',
  // Alternates are emitted from the page's own metadata, off the story's real
  // translations — next-intl would otherwise advertise a locale the story has
  // not been translated into.
  alternateLinks: false,
  // No Accept-Language/cookie redirects: an unprefixed URL is ALWAYS the default
  // locale. Otherwise the NEXT_LOCALE cookie 307s a language switcher's own link
  // straight back where it came from, and auto locale redirects hurt SEO.
  localeDetection: false,
})
