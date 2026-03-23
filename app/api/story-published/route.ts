import { revalidatePath } from 'next/cache'
import StoryblokClient from 'storyblok-js-client'

export async function POST(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  const body = await req.json()
  // This secret should only be known to this API route and the CMS
  if (secret !== process.env.API_SECRET) {
    return new Response('Invalid token', { status: 401 })
  }
  // The request contains a story_id in the body
  if (!body.story_id) {
    return new Response('Invalid request', { status: 401 })
  }
  const storyblok = new StoryblokClient({ accessToken: process.env.NEXT_PUBLIC_STORYBLOK_TOKEN })
  // Revalidate the path
  storyblok
    .get(`cdn/stories/${body.story_id}`, { version: 'published' })
    .then(async sbResult => {
      const story = sbResult.data.story
      if (story.slug !== 'global') {
        revalidatePath(`/${story.full_slug}`)
      }
    })
    .catch(e => {
      console.log(e)
    })
  return new Response('Story published', { status: 200 })
}
