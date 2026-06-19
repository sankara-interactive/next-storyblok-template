import { ISbStoryData, StoryblokStory } from '@storyblok/react/rsc'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Logo from '../../components/layout/Logo'
import { getAllLinks, getStory } from '../../lib/storyblok-api'
import { isDataRoute } from '../../lib/storyblok-routes'
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
  if (isDataRoute(slug)) return {}
  const story = await getStory<ContentType>(slug)

  if (!story) {
    return {}
  }

  const title = story.content?.seo?.title || story.name
  const description = story.content?.seo?.description
  return {
    metadataBase: new URL('https://your-brand.ch'),
    title: `${title} · Your Brand`,
    description: description,
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: title,
      description: description,
      url: `/${story.slug}`,
    },
    twitter: {
      card: 'summary',
      title: title,
      description: description,
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
