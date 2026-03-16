import { ReactElement } from 'react'
import StoryblokProvider from '../components/StoryblokProvider'
import '../styles/globals.css'

type RootLayoutProps = {
  children: ReactElement
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <StoryblokProvider>
      <html lang="de-CH">
        <body>{children}</body>
      </html>
    </StoryblokProvider>
  )
}
