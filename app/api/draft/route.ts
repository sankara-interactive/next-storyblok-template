import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import StoryblokClient from 'storyblok-js-client'
import { bridgeParams } from '@/lib/draft'
import { isDataRoute } from '@/lib/storyblok-routes'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')

  if (secret !== process.env.API_SECRET || !slug) {
    return new Response('Invalid token', { status: 401 })
  }

  const storyblok = new StoryblokClient({
    accessToken: process.env.STORYBLOK_PREVIEW_TOKEN,
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

  // Forward ONLY the bridge params; never the secret.
  const bridge = bridgeParams(searchParams)
  redirect(`/${fullSlug}${bridge ? `?${bridge}` : ''}`)
}
