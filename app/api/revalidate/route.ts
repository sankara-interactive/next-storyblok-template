import { revalidateTag } from 'next/cache'
import { env } from '@/lib/env'
import { revalidationTags } from '@/lib/storyblok-routes'
import { verifyUrlSecret, verifyWebhookSignature } from '@/lib/webhook'

export async function POST(req: Request) {
  const raw = await req.text()
  const signature = req.headers.get('webhook-signature')
  const urlSecret = new URL(req.url).searchParams.get('secret')

  // The URL secret is opt-in and its own value: a site that signs never accepts
  // it, and a leaked URL never reveals the signing key.
  if (
    !verifyWebhookSignature(raw, signature, env.STORYBLOK_WEBHOOK_SECRET ?? '') &&
    !verifyUrlSecret(urlSecret, env.STORYBLOK_WEBHOOK_URL_SECRET ?? '')
  ) {
    return new Response('Invalid signature', { status: 401 })
  }

  let payload: { action?: string; full_slug?: string }
  try {
    payload = JSON.parse(raw)
  } catch {
    return new Response('Invalid body', { status: 400 })
  }

  // Next 16 requires a cacheLife profile for on-demand purges.
  for (const tag of revalidationTags(payload.action, payload.full_slug)) {
    revalidateTag(tag, 'max')
  }
  return new Response('Revalidated', { status: 200 })
}
