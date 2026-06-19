import { ISbStoryData, StoryblokStory } from '@storyblok/react/rsc'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Logo from '@/components/layout/Logo'
import { SITE_NAME, SITE_URL, isPreview } from '@/lib/config'
import { getAllLinks, getStory } from '@/lib/storyblok-api'
import { isDataRoute } from '@/lib/storyblok-routes'
import { PageStoryblok } from '@storyblok-component-types'

export type ContentType = PageStoryblok // add more content types if needed

export const revalidate = 3600
export const dynamicParams = true

type Props = {
  params: Promise<{ slug?: string[] }>
}

function slugFromParams(slug?: string[]): string {
  return slug && slug.length ? slug.join('/') : 'home'
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

  const seo = (story.content as { seo?: Record<string, string> }).seo ?? {}
  const title = seo.title || story.name
  const description = seo.description || undefined
  const canonicalPath = slug === 'home' ? '/' : `/${slug}`
  const ogImage = seo.og_image || undefined

  return {
    metadataBase: new URL(SITE_URL),
    title: `${title} · ${SITE_NAME}`,
    description,
    alternates: { canonical: canonicalPath },
    robots: isPreview
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: seo.og_title || title,
      description: seo.og_description || description,
      url: canonicalPath,
      siteName: SITE_NAME,
      images: ogImage ? [{ url: ogImage }] : undefined,
    },
    twitter: {
      card: ogImage ? 'summary_large_image' : 'summary',
      title: seo.og_title || title,
      description: seo.og_description || description,
      images: ogImage ? [ogImage] : undefined,
    },
  }
}

export default async function Home(props: Props) {
  const params = await props.params
  const slug = slugFromParams(params.slug)
  if (isDataRoute(slug)) notFound()

  const story = await getStory<ContentType>(slug)
  if (!story) notFound()

  return (
    <>
      <nav className="container w-full mx-auto p-4">
        <div className="flex justify-center">
          <Logo />
        </div>
      </nav>
      <StoryblokStory story={story as ISbStoryData} />
      <footer className="p-4">Your Footer</footer>
    </>
  )
}
