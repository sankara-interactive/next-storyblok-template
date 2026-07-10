import type { Metadata } from 'next'
import { ReactNode } from 'react'
import Pirsch from '@/components/analytics/Pirsch'
import JsonLd from '@/components/seo/JsonLd'
import { SITE_NAME, SITE_URL } from '@/lib/config'
import '@/styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  openGraph: { siteName: SITE_NAME, locale: 'de_CH', type: 'website' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  // Bridge/live-editing is handled by <StoryblokStory> (renders the SDK's
  // StoryblokLiveEditing, gated on isVisualEditor()). No provider needed.
  return (
    <html lang="de-CH">
      <body>
        {children}
        <Pirsch />
        <JsonLd />
      </body>
    </html>
  )
}
