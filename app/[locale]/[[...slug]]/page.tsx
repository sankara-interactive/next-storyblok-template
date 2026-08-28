import { StoryblokStory } from '@storyblok/react/rsc'
import { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import Logo from '@/components/layout/Logo'
import { isPreview, OG_DEFAULTS, OG_LOCALE } from '@/lib/config'
import { hreflangAlternates, localePath } from '@/lib/locale'
import { findRedirect, getRedirects, queryString, withQuery } from '@/lib/redirects'
import { getAllLinks, getStory } from '@/lib/storyblok-api'
import { isDataRoute } from '@/lib/storyblok-routes'
import { routing } from '@/i18n/routing'
import { setRequestLocale } from 'next-intl/server'
import { PageStoryblok } from '@storyblok-component-types'

export type ContentType = PageStoryblok // add more content types if needed

export const revalidate = 3600

type Props = {
  params: Promise<{ locale: string; slug?: string[] }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function slugFromParams(slug?: string[]): string {
  return slug && slug.length ? slug.join('/') : 'home'
}

// Only this segment's params — Next builds the product with the [locale] ones
// generateStaticParams in the layout returns.
export async function generateStaticParams() {
  const links = await getAllLinks()
  const paths: { slug: string[] }[] = []
  Object.values(links).forEach(link => {
    if (link.is_folder || link.slug === 'home' || isDataRoute(link.slug)) return
    paths.push({ slug: link.slug.split('/') })
  })
  return paths
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { locale, slug: segments } = await props.params
  const slug = slugFromParams(segments)
  if (isDataRoute(slug)) return { robots: { index: false, follow: false } }

  const story = await getStory<ContentType>(slug, locale)
  if (!story) return {}

  const seo = story.content.seo ?? {}
  const title = seo.title || story.name
  const description = seo.description || undefined
  const canonicalPath = localePath(locale, slug)

  return {
    title,
    description,
    alternates: { canonical: canonicalPath, languages: hreflangAlternates(slug) },
    robots: isPreview ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      ...OG_DEFAULTS,
      locale: OG_LOCALE[locale] ?? locale,
      title,
      description,
      url: canonicalPath,
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default async function Home(props: Props) {
  const { locale, slug: segments } = await props.params
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) notFound()
  setRequestLocale(locale)

  const slug = slugFromParams(segments)
  if (isDataRoute(slug)) notFound()

  const story = await getStory<ContentType>(slug, locale)
  if (!story) {
    // Only awaited here, so live pages stay statically rendered.
    const match = findRedirect(await getRedirects(), localePath(locale, slug))
    if (match) {
      const target = withQuery(match.destination, queryString(await props.searchParams))
      if (match.permanent) permanentRedirect(target)
      redirect(target)
    }
    notFound()
  }

  return (
    <>
      <nav className="container w-full mx-auto p-4">
        <div className="flex justify-center">
          <Logo />
        </div>
      </nav>
      <StoryblokStory story={story} />
      <footer className="p-4">Your Footer</footer>
    </>
  )
}
