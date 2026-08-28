import Link from 'next/link'

// Recovery links, not just an apology: a crawler landing here otherwise hits a
// dead end with no route back into the site.
export default function NotFound() {
  return (
    <main className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="mt-2">Diese Seite wurde nicht gefunden.</p>
      <ul className="mt-4 flex flex-wrap justify-center gap-4">
        <li>
          <Link href="/" className="underline">
            Zur Startseite
          </Link>
        </li>
        <li>
          <a href="/sitemap.xml" className="underline">
            Alle Seiten
          </a>
        </li>
        <li>
          <a href="/llms.txt" className="underline">
            llms.txt
          </a>
        </li>
      </ul>
    </main>
  )
}
