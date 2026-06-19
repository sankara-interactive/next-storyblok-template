import { revalidateTag } from 'next/cache'
import { STORYBLOK_CACHE_TAG } from '../../../lib/config'
import { verifyWebhookSignature } from '../../../lib/webhook'

export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('webhook-signature')
  const secret = process.env.STORYBLOK_WEBHOOK_SECRET ?? ''

  if (!verifyWebhookSignature(raw, signature, secret)) {
    return new Response('Invalid signature', { status: 401 })
  }

  try {
    JSON.parse(raw) // hardened parse; payload not otherwise needed for a tag flush
  } catch {
    return new Response('Invalid body', { status: 400 })
  }

  await revalidateTag(STORYBLOK_CACHE_TAG, 'default')
  return new Response('Revalidated', { status: 200 })
}
