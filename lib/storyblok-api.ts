import 'server-only'
import { ISbStoryData } from '@storyblok/react/rsc'
import StoryblokClient from 'storyblok-js-client'
import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { isPreview, STORYBLOK_CACHE_TAG } from './config'
import { getStoryblokApi } from './storyblok'

export type SbLink = { slug: string; is_folder: boolean }

const isDev = process.env.NODE_ENV === 'development'

export function resolveVersion(isDraft: boolean): 'draft' | 'published' {
  return isDev || isPreview || isDraft ? 'draft' : 'published'
}

let previewClient: StoryblokClient | null = null
function getPreviewClient(): StoryblokClient {
  if (!previewClient) {
    previewClient = new StoryblokClient({ accessToken: process.env.STORYBLOK_PREVIEW_TOKEN })
  }
  return previewClient
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
      const api = getPreviewClient()
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
