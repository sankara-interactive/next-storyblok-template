import { revalidateTag } from 'next/cache'
import { requireEnv } from '@/lib/env'
import { revalidationTag } from '@/lib/storyblok-routes'
import { verifyWebhookSignature } from '@/lib/webhook'

export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('webhook-signature')

  if (!verifyWebhookSignature(raw, signature, requireEnv('STORYBLOK_WEBHOOK_SECRET'))) {
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: { action?: string; full_slug?: string }
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('Invalid body', { status: 400 })
  }

  // Next 16 requires a cacheLife profile; 'max' is the on-demand-purge drop-in.
  revalidateTag(revalidationTag(payload.action, payload.full_slug), 'max')
  return new Response('Revalidated', { status: 200 })
}
