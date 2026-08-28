import { revalidateTag } from 'next/cache'
import { invalidateByTag } from '@vercel/functions'
import { env } from '@/lib/env'
import { LINKS_CACHE_TAG, SITEMAP_CDN_TAG } from '@/lib/config'
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
  const tags = revalidationTags(payload.action, payload.full_slug)
  for (const tag of tags) {
    revalidateTag(tag, 'max')
  }

  // Hard-expire, not 'max': 'max' only marks the inventory stale, so the first
  // crawler after the purge below could read pre-publish links and have that XML
  // held at the CDN for a year with no further purge queued.
  revalidateTag(LINKS_CACHE_TAG, { expire: 0 })

  // Vercel's CDN tag namespace, not Next's — the only thing that reaches the XML.
  // Absent off Vercel; a failure here must not fail the webhook.
  let sitemap = 'sitemap:skipped'
  try {
    await invalidateByTag(SITEMAP_CDN_TAG)
    sitemap = 'sitemap:invalidated'
  } catch (error) {
    console.warn('CDN sitemap purge failed', error)
  }

  return new Response(`Revalidated: ${tags.join(', ')} + ${sitemap}`, { status: 200 })
}
