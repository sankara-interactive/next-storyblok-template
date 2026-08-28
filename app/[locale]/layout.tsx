import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { setRequestLocale } from 'next-intl/server'
import Pirsch from '@/components/analytics/Pirsch'
import JsonLd from '@/components/seo/JsonLd'
import { HTML_LANG, OG_DEFAULTS, OG_LOCALE, SITE_NAME, SITE_URL } from '@/lib/config'
import { routing } from '@/i18n/routing'
import '@/styles/globals.css'

// The root layout, not app/layout.tsx: <html lang> needs the locale, and only a
// segment below [locale] can read it. Route handlers sit outside and need none.
export function generateStaticParams() {
  return routing.locales.map(locale => ({ locale }))
}

export async function generateMetadata(props: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await props.params
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
    openGraph: { ...OG_DEFAULTS, locale: OG_LOCALE[locale] ?? locale },
  }
}

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  // Opts the segment into static rendering; without it every page goes dynamic.
  setRequestLocale(locale)

  // <StoryblokStory> handles the bridge via the SDK; no provider needed.
  return (
    <html lang={HTML_LANG[locale] ?? locale}>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Pirsch />
        <JsonLd />
      </body>
    </html>
  )
}
