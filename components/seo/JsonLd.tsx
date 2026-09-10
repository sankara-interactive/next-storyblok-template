import { SITE_NAME, SITE_URL } from '@/lib/config'

// Sitewide structured data. Extend Organization per project from a Storyblok
// global: agents look for logo, sameAs, description, address and contactPoint.
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
