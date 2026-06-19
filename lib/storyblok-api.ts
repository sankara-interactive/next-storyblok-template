import 'server-only'
import { ISbStoryData } from '@storyblok/react/rsc'
import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { STORYBLOK_CACHE_TAG } from './config'
import { getStoryblokApi } from './storyblok'

export type SbLink = { slug: string; is_folder: boolean }

const isDev = process.env.NODE_ENV === 'development'

export function resolveVersion(isDraft: boolean): 'draft' | 'published' {
  return isDev || isDraft ? 'draft' : 'published'
}

const fetchPublishedStory = unstable_cache(
  async (slug: string) => {
    const api = getStoryblokApi()
    const { data } = await api.get(`cdn/stories/${slug}`, {
      version: 'published',
      resolve_links: 'url',
    })
    return data.story
  },
  ['storyblok-story'],
  { tags: [STORYBLOK_CACHE_TAG] },
)

export async function getStory<T>(slug: string): Promise<ISbStoryData<T> | null> {
  const { isEnabled: isDraft } = await draftMode()
  const version = resolveVersion(isDraft)
  try {
    if (version === 'draft') {
      const api = getStoryblokApi()
      const { data } = await api.get(`cdn/stories/${slug}`, {
        version: 'draft',
        resolve_links: 'url',
        cv: Date.now(),
      })
      return data.story as ISbStoryData<T>
    }
    return (await fetchPublishedStory(slug)) as ISbStoryData<T>
  } catch {
    return null
  }
}

const fetchLinks = unstable_cache(
  async () => {
    const api = getStoryblokApi()
    const { data } = await api.get('cdn/links/', { version: 'published' })
    return data.links as Record<string, SbLink>
  },
  ['storyblok-links'],
  { tags: [STORYBLOK_CACHE_TAG] },
)

export async function getAllLinks(): Promise<Record<string, SbLink>> {
  return fetchLinks()
}
