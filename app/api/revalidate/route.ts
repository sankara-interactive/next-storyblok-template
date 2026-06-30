import { revalidateTag } from 'next/cache'
import { revalidationTag } from '@/lib/storyblok-routes'
import { verifyWebhookSignature } from '@/lib/webhook'

export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('webhook-signature')
  const secret = process.env.STORYBLOK_WEBHOOK_SECRET ?? ''

  if (!verifyWebhookSignature(raw, signature, secret)) {
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: { action?: string; full_slug?: string }
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('Invalid body', { status: 400 })
  }

  // Next 16: revalidateTag requires a cacheLife profile; 'max' is the
  // documented drop-in for on-demand purge (single-arg form is deprecated).
  revalidateTag(revalidationTag(payload.action, payload.full_slug), 'max')
  return new Response('Revalidated', { status: 200 })
}
