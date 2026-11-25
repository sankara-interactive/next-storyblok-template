import { defineRouting } from 'next-intl/routing'
import { DEFAULT_LOCALE, LOCALES } from '@/lib/config'

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  localePrefix: 'as-needed',
  // Page metadata supplies alternate links.
  alternateLinks: false,
  // An unprefixed URL always uses the default locale. Disable cookie redirects.
  localeDetection: false,
})
