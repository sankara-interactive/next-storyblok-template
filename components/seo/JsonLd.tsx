import { SITE_NAME, SITE_URL } from '@/lib/config'

// Sitewide structured data; extend Organization with `logo`/`sameAs` per project.
export default function JsonLd() {
  const graph = [
    { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
    { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  ]
  const json = { '@context': 'https://schema.org', '@graph': graph }
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }} />
  )
}
