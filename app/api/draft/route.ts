import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import StoryblokClient from 'storyblok-js-client'
import { env, requireEnv } from '@/lib/env'
import { isDataRoute } from '@/lib/storyblok-routes'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')
  const expectedSecret = requireEnv('API_SECRET', env.API_SECRET)

  if (secret !== expectedSecret || !slug) {
    return new Response('Invalid token', { status: 401 })
  }

  const storyblok = new StoryblokClient({
    accessToken: requireEnv('STORYBLOK_PREVIEW_TOKEN', env.STORYBLOK_PREVIEW_TOKEN),
  })
  const { data } = await storyblok.get(`cdn/stories/${slug}`, {
    version: 'draft',
    excluding_fields: 'body',
  })
  if (!data?.story) {
    return new Response('Invalid slug', { status: 401 })
  }

  const fullSlug: string = data.story.full_slug
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
  redirect(`/${fullSlug}${qs ? `?${qs}` : ''}`)
}
