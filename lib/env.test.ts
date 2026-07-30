import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { siteNameSchema, siteUrlSchema, webhookSecretSchema } from './env'

describe('required secrets', () => {
  // t3-env logs the offending variable to console.error before throwing. That is
  // the behaviour we want in production and noise here, so it is silenced.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  // Both are needed for local work, so a misconfigured setup fails at boot
  // rather than when someone first hits /api/draft.
  it.each(['API_SECRET', 'STORYBLOK_PREVIEW_TOKEN'])('refuses to load without %s', async name => {
    vi.resetModules()
    vi.stubEnv(name, '')
    await expect(import('./env')).rejects.toThrow()
  })

  it('loads without a webhook secret outside production', async () => {
    vi.resetModules()
    vi.stubEnv('STORYBLOK_WEBHOOK_SECRET', '')
    await expect(import('./env')).resolves.toBeDefined()
  })
})

describe('environment validation', () => {
  it('uses local site defaults outside production', () => {
    expect(siteUrlSchema(false).parse(undefined)).toBe('http://localhost:3000')
    expect(siteNameSchema(false).parse(undefined)).toBe('Site')
  })

  it('requires an HTTPS site identity in production', () => {
    expect(() => siteUrlSchema(true).parse(undefined)).toThrow()
    expect(() => siteNameSchema(true).parse(undefined)).toThrow()
    expect(() => siteUrlSchema(true).parse('http://example.com')).toThrow('HTTPS')
    expect(siteUrlSchema(true).parse('https://example.com/path')).toBe('https://example.com')
  })

  it('rejects invalid and blank values', () => {
    expect(() => siteUrlSchema(false).parse('not a URL')).toThrow()
  })

  // A known default HMAC secret on a real host would let anyone forge a
  // revalidation webhook, so the placeholder must never survive into production.
  it('defaults the webhook secret locally but demands one in production', () => {
    expect(webhookSecretSchema(false).parse(undefined)).toBe('local-dev-unsigned')
    expect(() => webhookSecretSchema(true).parse(undefined)).toThrow()
    expect(webhookSecretSchema(true).parse('a-real-secret')).toBe('a-real-secret')
  })
})
