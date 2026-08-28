import { defineRouting } from 'next-intl/routing'
import { DEFAULT_LOCALE, LOCALES } from '@/lib/config'

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // The default locale is unprefixed: `/about`, not `/de/about`.
  localePrefix: 'as-needed',
  // Alternates come from the page's own metadata instead.
  alternateLinks: false,
  // An unprefixed URL is ALWAYS the default locale — otherwise the NEXT_LOCALE
  // cookie 307s a language switcher's own link back where it came from.
  localeDetection: false,
})
