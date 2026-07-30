import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { devDefault, siteUrlSchema } from './env'

describe('required secrets', () => {
  // t3-env logs the offending variable before throwing — wanted in production,
  // noise here.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  // Needed for local work, so a bad setup fails at boot, not at /api/draft.
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
  // Shared by SITE_NAME and the webhook secret. The placeholder must never
  // survive into production — see the schema's comment for why.
  it('defaults outside production and demands a value in it', () => {
    expect(devDefault(false, 'Site').parse(undefined)).toBe('Site')
    expect(() => devDefault(true, 'Site').parse(undefined)).toThrow()
    expect(devDefault(true, 'Site').parse('a-real-secret')).toBe('a-real-secret')
  })

  it('uses a localhost site URL outside production', () => {
    expect(siteUrlSchema(false).parse(undefined)).toBe('http://localhost:3000')
  })

  it('requires an HTTPS site URL in production', () => {
    expect(() => siteUrlSchema(true).parse(undefined)).toThrow()
    expect(() => siteUrlSchema(true).parse('http://example.com')).toThrow('HTTPS')
    expect(siteUrlSchema(true).parse('https://example.com/path')).toBe('https://example.com')
  })
})
