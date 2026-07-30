import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { siteNameSchema, siteUrlSchema } from './env'

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

  // These are required, not optional, so a misconfigured deploy fails at boot
  // rather than when someone first hits /api/draft or publishes a story.
  it.each(['API_SECRET', 'STORYBLOK_PREVIEW_TOKEN', 'STORYBLOK_WEBHOOK_SECRET'])(
    'refuses to load without %s',
    async name => {
      vi.resetModules()
      vi.stubEnv(name, '')
      await expect(import('./env')).rejects.toThrow()
    }
  )
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
})
