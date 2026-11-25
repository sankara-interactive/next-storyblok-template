import { createHmac } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyUrlSecret, verifyWebhookSignature } from './webhook'

const secret = 'topsecret'
const body = JSON.stringify({ story_id: 42, action: 'published' })
const sign = (b: string, s: string) => createHmac('sha1', s).update(b).digest('hex')

describe('verifyWebhookSignature', () => {
  it('accepts a correct signature', () => {
    expect(verifyWebhookSignature(body, sign(body, secret), secret)).toBe(true)
  })
  it('rejects a wrong signature', () => {
    expect(verifyWebhookSignature(body, sign(body, 'wrong'), secret)).toBe(false)
  })
  it('rejects a missing signature', () => {
    expect(verifyWebhookSignature(body, null, secret)).toBe(false)
  })
  it('rejects when body is tampered', () => {
    expect(verifyWebhookSignature(body + ' ', sign(body, secret), secret)).toBe(false)
  })
})

describe('verifyUrlSecret', () => {
  it('accepts the matching secret', () => {
    expect(verifyUrlSecret(secret, secret)).toBe(true)
  })
  it('rejects a wrong or missing secret', () => {
    expect(verifyUrlSecret('wrong', secret)).toBe(false)
    expect(verifyUrlSecret(null, secret)).toBe(false)
  })
  it('rejects anything when no secret is configured', () => {
    expect(verifyUrlSecret('', '')).toBe(false)
  })
})
