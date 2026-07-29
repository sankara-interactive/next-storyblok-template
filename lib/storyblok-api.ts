import 'server-only'
import { ISbStoryData } from '@storyblok/react/rsc'
import StoryblokClient from 'storyblok-js-client'
import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { z } from 'zod'
import { isPreview, STORYBLOK_CACHE_TAG, storyTag } from './config'
import { env, isContentFetchDisabled } from './env'
import { getStoryblokApi } from './storyblok'

export type SbLink = { slug: string; is_folder: boolean }

const previewEnvSchema = z.object({
  STORYBLOK_PREVIEW_TOKEN: z.string().min(1),
})

const isDev = env.NODE_ENV === 'development'

export function resolveVersion(isDraft: boolean): 'draft' | 'published' {
  return isDev || isPreview || isDraft ? 'draft' : 'published'
}

let previewClient: StoryblokClient | null = null
function getPreviewClient(): StoryblokClient {
  if (!previewClient) {
    const previewEnv = previewEnvSchema.parse(env)
    previewClient = new StoryblokClient({
      accessToken: previewEnv.STORYBLOK_PREVIEW_TOKEN,
    })
  }
  return previewClient
}

// Built per-slug so the webhook can bust one story without flushing the rest.
function fetchPublishedStory(slug: string) {
  return unstable_cache(
    async () => {
      const api = getStoryblokApi()
      const { data } = await api.get(`cdn/stories/${slug}`, {
        version: 'published',
        resolve_links: 'url',
      })
      return data.story
    },
    ['storyblok-story', slug],
    { tags: [STORYBLOK_CACHE_TAG, storyTag(slug)] }
  )()
}

export async function getStory<T>(slug: string): Promise<ISbStoryData<T> | null> {
  if (isContentFetchDisabled()) return null
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
  } catch (error) {
    if (isStoryblokNotFound(error)) return null
    throw error
  }
}

export function isStoryblokNotFound(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { status?: unknown; response?: { status?: unknown } }
  return candidate.status === 404 || candidate.response?.status === 404
}

const fetchLinks = unstable_cache(
  async () => {
    const api = getStoryblokApi()
    const { data } = await api.get('cdn/links/', { version: 'published' })
    return data.links as Record<string, SbLink>
  },
  ['storyblok-links'],
  { tags: [STORYBLOK_CACHE_TAG] }
)

export async function getAllLinks(): Promise<Record<string, SbLink>> {
  if (isContentFetchDisabled()) return {}
  return fetchLinks()
}
