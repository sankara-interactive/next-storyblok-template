import { createHmac, timingSafeEqual } from 'node:crypto'

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB)
}

export function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature || !secret) return false
  return safeEqual(createHmac('sha1', secret).update(rawBody).digest('hex'), signature)
}

/** For Storyblok plans that cannot sign webhooks: `?secret=` on the webhook URL. */
export function verifyUrlSecret(provided: string | null, secret: string): boolean {
  if (!provided || !secret) return false
  return safeEqual(provided, secret)
}
