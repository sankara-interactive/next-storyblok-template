import { draftMode } from 'next/headers'
import type { Metadata } from 'next'
import { ReactNode } from 'react'
import Pirsch from '@/components/analytics/Pirsch'
import JsonLd from '@/components/seo/JsonLd'
import StoryblokProvider from '@/components/StoryblokProvider'
import { SITE_NAME, SITE_URL } from '@/lib/config'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  openGraph: { siteName: SITE_NAME, locale: 'de_CH', type: 'website' },
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { isEnabled: bridge } = await draftMode()
  return (
    <html lang="de-CH">
      <body>
        <StoryblokProvider bridge={bridge}>{children}</StoryblokProvider>
        <Pirsch />
        <JsonLd />
      </body>
    </html>
  )
}
