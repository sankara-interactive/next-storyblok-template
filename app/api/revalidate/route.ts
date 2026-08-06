import { revalidateTag } from 'next/cache'
import { env } from '@/lib/env'
import { revalidationTags } from '@/lib/storyblok-routes'
import { verifyWebhookSignature } from '@/lib/webhook'

export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('webhook-signature')

  if (!verifyWebhookSignature(raw, signature, env.STORYBLOK_WEBHOOK_SECRET)) {
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: { action?: string; full_slug?: string }
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('Invalid body', { status: 400 })
  }

  // Next 16 requires a cacheLife profile; 'max' is the on-demand-purge drop-in.
  for (const tag of revalidationTags(payload.action, payload.full_slug)) {
    revalidateTag(tag, 'max')
  }
  return new Response('Revalidated', { status: 200 })
}
