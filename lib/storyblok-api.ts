import 'server-only'
import { ISbStoryData } from '@storyblok/react/rsc'
import StoryblokClient from 'storyblok-js-client'
import { unstable_cache } from 'next/cache'
import { draftMode } from 'next/headers'
import { isPreview, LINKS_CACHE_TAG, STORYBLOK_CACHE_TAG, storyTag } from './config'
import { env } from './env'
import { DEFAULT_LOCALE } from './config'
import { getStoryblokApi } from './storyblok'

export type SbLink = { slug: string; is_folder: boolean }

const isDev = env.NODE_ENV === 'development'

export function resolveVersion(isDraft: boolean): 'draft' | 'published' {
  return isDev || isPreview || isDraft ? 'draft' : 'published'
}

/**
 * CDN `language` param: only set for a non-default locale. The default locale is
 * the base content, and passing it explicitly would ask Storyblok for a
 * translation dimension that does not exist.
 */
export function resolveLanguage(locale?: string): string | undefined {
  return locale && locale !== DEFAULT_LOCALE ? locale : undefined
}

let previewClient: StoryblokClient | null = null
function getPreviewClient(): StoryblokClient {
  if (!previewClient) {
    // Draft mode refetches everything per request (no cross-request cache by
    // design), so bursts hit the preview token's ~3 req/s limit and exhaust
    // the SDK's default retries → error page. Throttle client-side instead.
    previewClient = new StoryblokClient({
      accessToken: env.STORYBLOK_PREVIEW_TOKEN,
      rateLimit: 3,
      maxRetries: 10,
    })
  }
  return previewClient
}

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build'
}

/** Exported for tests. */
export const buildMemoCache = new Map<string, Promise<unknown>>()

/**
 * Draft reads can't change mid-build, so share one fetch per key per worker —
 * per-request otherwise, since the visual editor needs live drafts.
 */
export function memoizeDuringBuild<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  if (!isBuildPhase()) return fetcher()
  const cached = buildMemoCache.get(key)
  if (cached) return cached as Promise<T>
  const promise = fetcher()
  buildMemoCache.set(key, promise)
  promise.catch(() => buildMemoCache.delete(key))
  return promise
}

function httpStatus(error: unknown): number | undefined {
  const e = error as { status?: number; response?: { status?: number } } | undefined
  return e?.status ?? e?.response?.status
}

/**
 * Retry reads that die below HTTP (fetch failed, socket reset) or after the
 * SDK exhausts its 429 retries. The SDK absorbs rate limits itself, but a
 * single network-level failure rethrows immediately — and during a static
 * export that one throw kills the whole build. 404 and other client errors
 * pass through untouched (a 404 misread as transient would retry real misses).
 * Exported for tests.
 */
export async function withTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      const status = httpStatus(error)
      const transient = status === undefined || status === 429 || status >= 500
      if (!transient || attempt >= 4) throw error
      await new Promise(resolve => setTimeout(resolve, 500 * attempt))
    }
  }
}

// Built per-slug so the webhook can bust one story without flushing the rest.
// The cache KEY carries the language, but the TAG does not: one story holds all
// its translations, so a publish busts every locale variant at once.
function fetchPublishedStory(slug: string, language?: string) {
  return unstable_cache(
    async () => {
      const api = getStoryblokApi()
      const { data } = await withTransientRetry(() =>
        api.get(`cdn/stories/${slug}`, {
          version: 'published',
          resolve_links: 'url',
          ...(language ? { language } : {}),
        })
      )
      return data.story
    },
    ['storyblok-story', slug, language ?? 'default'],
    { tags: [STORYBLOK_CACHE_TAG, storyTag(slug)] }
  )()
}

export async function getStory<T>(slug: string, locale?: string): Promise<ISbStoryData<T> | null> {
  if (env.STORYBLOK_SKIP_FETCH) return null
  const { isEnabled: isDraft } = await draftMode()
  const version = resolveVersion(isDraft)
  const language = resolveLanguage(locale)
  try {
    if (version === 'draft') {
      const api = getPreviewClient()
      const { data } = await memoizeDuringBuild(
        `storyblok-story-draft:${slug}:${language ?? 'default'}`,
        () =>
          withTransientRetry(() =>
            api.get(`cdn/stories/${slug}`, {
              version: 'draft',
              resolve_links: 'url',
              cv: Date.now(),
              ...(language ? { language } : {}),
            })
          )
      )
      return data.story as ISbStoryData<T>
    }
    return (await fetchPublishedStory(slug, language)) as ISbStoryData<T>
  } catch (error) {
    if (isStoryblokNotFound(error)) return null
    throw error
  }
}

export function isStoryblokNotFound(error: unknown): boolean {
  return httpStatus(error) === 404
}

const fetchLinks = unstable_cache(
  async () => {
    const api = getStoryblokApi()
    const { data } = await withTransientRetry(() => api.get('cdn/links/', { version: 'published' }))
    return data.links as Record<string, SbLink>
  },
  ['storyblok-links'],
  { tags: [STORYBLOK_CACHE_TAG, LINKS_CACHE_TAG] }
)

export async function getAllLinks(): Promise<Record<string, SbLink>> {
  if (env.STORYBLOK_SKIP_FETCH) return {}
  return fetchLinks()
}
