import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import StoryblokClient from 'storyblok-js-client'
import { DEFAULT_LOCALE } from '@/lib/config'
import { env } from '@/lib/env'
import { localePath } from '@/lib/locale'
import { isStoryblokNotFound } from '@/lib/storyblok-api'
import { isDataRoute } from '@/lib/storyblok-routes'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')

  if (secret !== env.API_SECRET || !slug) {
    return new Response('Invalid token', { status: 401 })
  }

  const storyblok = new StoryblokClient({
    accessToken: env.STORYBLOK_PREVIEW_TOKEN,
  })
  let fullSlug: string
  try {
    const { data } = await storyblok.get(`cdn/stories/${slug}`, {
      version: 'draft',
      excluding_fields: 'body',
    })
    fullSlug = data.story.full_slug
  } catch (error) {
    // The client rejects on 404 rather than returning an empty story.
    if (isStoryblokNotFound(error)) return new Response('Invalid slug', { status: 401 })
    throw error
  }

  if (isDataRoute(fullSlug)) {
    return new Response('Not previewable as a page', { status: 400 })
  }

  const draft = await draftMode()
  draft.enable()

  // Forward ONLY the Storyblok bridge params; never the secret.
  const bridge = new URLSearchParams()
  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith('_storyblok')) bridge.append(key, value)
  }
  const qs = bridge.toString()
  redirect(`${localePath(DEFAULT_LOCALE, fullSlug)}${qs ? `?${qs}` : ''}`)
}
