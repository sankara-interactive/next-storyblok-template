import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import StoryblokClient from 'storyblok-js-client'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  const slug = searchParams.get('slug')

  // Check the secret and next parameters
  // This secret should only be known to this route handler and the CMS
  if (secret !== process.env.API_SECRET || !slug) {
    return new Response('Invalid token', { status: 401 })
  }

  // Fetch the headless CMS to check if the provided `slug` exists
  const storyblok = new StoryblokClient({ accessToken: process.env.STORYBLOK_PREVIEW_TOKEN })
  const { data } = await storyblok.get(`cdn/stories/${slug}`, {
    version: 'draft',
    excluding_fields: 'header,body,seo',
  })

  // If the slug doesn't exist prevent draft mode from being enabled
  if (!data?.story) {
    return new Response('Invalid slug', { status: 401 })
  }

  // Enable Draft Mode by setting the cookie
  const draft = await draftMode()
  draft.enable()

  // Redirect to the path from the fetched post, pass the search parameters to initialize Storyblok bridge
  // We don't redirect to searchParams.slug as that might lead to open redirect vulnerabilities
  redirect(`/${data.story.full_slug}?${searchParams.toString()}`)
}
