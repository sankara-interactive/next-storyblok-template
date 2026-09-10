import { StoryblokStory } from '@storyblok/react/rsc'
import { Metadata } from 'next'
import { notFound, permanentRedirect, redirect } from 'next/navigation'
import Logo from '@/components/layout/Logo'
import { isPreview, OG_DEFAULTS } from '@/lib/config'
import { findRedirect, getRedirects } from '@/lib/redirects'
import { getAllLinks, getStory } from '@/lib/storyblok-api'
import { isDataRoute } from '@/lib/storyblok-routes'
import { PageStoryblok } from '@storyblok-component-types'

export type ContentType = PageStoryblok // add more content types if needed

export const revalidate = 3600

type Props = {
  params: Promise<{ slug?: string[] }>
}

function slugFromParams(slug?: string[]): string {
  return slug && slug.length ? slug.join('/') : 'home'
}

function pathFromSlug(slug: string): string {
  return slug === 'home' ? '/' : `/${slug}`
}

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
  const params = await props.params
  const slug = slugFromParams(params.slug)
  if (isDataRoute(slug)) return { robots: { index: false, follow: false } }

  const story = await getStory<ContentType>(slug)
  if (!story) return {}

  const seo = story.content.seo ?? {}
  const title = seo.title || story.name
  const description = seo.description || undefined
  const canonicalPath = pathFromSlug(slug)

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: isPreview ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
      ...OG_DEFAULTS,
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
  const params = await props.params
  const slug = slugFromParams(params.slug)
  if (isDataRoute(slug)) notFound()

  const story = await getStory<ContentType>(slug)
  if (!story) {
    // An unknown path is rendered as an on-demand static generation, so no
    // dynamic API (searchParams, headers) may be read in this branch — it
    // throws DYNAMIC_SERVER_USAGE and the redirect becomes a 500. The query
    // string of a retired URL is therefore dropped, not carried over.
    const match = findRedirect(await getRedirects(), pathFromSlug(slug))
    if (match) {
      if (match.permanent) permanentRedirect(match.destination)
      redirect(match.destination)
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
