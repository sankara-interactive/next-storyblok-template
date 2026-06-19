import { draftMode } from 'next/headers'
import { ReactNode } from 'react'
import ConsentManager from '../components/analytics/ConsentManager'
import Pirsch from '../components/analytics/Pirsch'
import StoryblokProvider from '../components/StoryblokProvider'
import '../styles/globals.css'

export default async function RootLayout({ children }: { children: ReactNode }) {
  const { isEnabled: bridge } = await draftMode()
  return (
    <html lang="de-CH">
      <body>
        <StoryblokProvider bridge={bridge}>{children}</StoryblokProvider>
        <Pirsch />
        <ConsentManager />
      </body>
    </html>
  )
}
