import { Heading } from '@sankara-ui/core'
import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container mx-auto p-8 text-center">
      <Heading level={1}>404</Heading>
      <p className="mt-2">Diese Seite wurde nicht gefunden.</p>
      <Link href="/" className="mt-4 inline-block underline">
        Zur Startseite
      </Link>
    </main>
  )
}
