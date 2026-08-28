import { SITE_NAME, SITE_URL } from '@/lib/config'

// Sitewide structured data. Extend Organization per project — agents verifying a
// business look for logo, sameAs, description, legalName, address (PostalAddress),
// contactPoint, email, telephone and vatID. Source them from a Storyblok global
// so an editor owns them; the template ships no `global` blok to guess at.
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
