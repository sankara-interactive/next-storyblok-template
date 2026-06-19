import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2">Diese Seite wurde nicht gefunden.</p>
      <Link href="/" className="mt-4 inline-block underline">
        Zur Startseite
      </Link>
    </main>
  )
}
