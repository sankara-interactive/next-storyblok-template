import { ReactNode } from 'react'
import StoryblokProvider from '../components/StoryblokProvider'
import '../styles/globals.css'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <StoryblokProvider>
      <html lang="de-CH">
        <body>{children}</body>
      </html>
    </StoryblokProvider>
  )
}
