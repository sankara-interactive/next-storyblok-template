import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import { notFound } from 'next/navigation'
import { ReactNode } from 'react'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import Pirsch from '@/components/analytics/Pirsch'
import JsonLd from '@/components/seo/JsonLd'
import { HTML_LANG, OG_DEFAULTS, OG_LOCALE, SITE_NAME, SITE_URL } from '@/lib/config'
import { routing } from '@/i18n/routing'
import '@/styles/globals.css'

const roboto = Roboto({ subsets: ['latin'], variable: '--font-roboto' })

// This layout owns <html lang>; route handlers are outside the layout tree.
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
  // Enables static rendering for the segment.
  setRequestLocale(locale)
  const t = await getTranslations('SkipLink')

  return (
    <html lang={HTML_LANG[locale] ?? locale} className={roboto.variable}>
      <body>
        <a
          href="#content"
          className="sr-only bg-white p-4 focus:not-sr-only focus:fixed focus:top-0 focus:left-0 focus:z-50"
        >
          {t('toContent')}
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
        <Pirsch />
        <JsonLd />
      </body>
    </html>
  )
}
