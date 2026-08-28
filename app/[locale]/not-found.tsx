import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

// Recovery links: a crawler landing here is otherwise at a dead end.
export default async function NotFound() {
  const t = await getTranslations('NotFound')
  return (
    <main className="container mx-auto p-8 text-center">
      <h1 className="text-4xl font-bold">{t('title')}</h1>
      <p className="mt-2">{t('message')}</p>
      <ul className="mt-4 flex flex-wrap justify-center gap-4">
        <li>
          <Link href="/" className="underline">
            {t('backHome')}
          </Link>
        </li>
        <li>
          <a href="/sitemap.xml" className="underline">
            {t('sitemap')}
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
