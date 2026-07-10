import { StoryblokStory } from '@storyblok/react/rsc'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Logo from '@/components/layout/Logo'
import { isPreview } from '@/lib/config'
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
  const canonicalPath = slug === 'home' ? '/' : `/${slug}`

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: isPreview ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: {
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
  if (!story) notFound()

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
