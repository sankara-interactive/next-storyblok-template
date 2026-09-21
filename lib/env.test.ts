import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { devDefault, siteUrlSchema } from './env'

describe('required secrets', () => {
  // Suppress expected validation output during these tests.
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  // These values are required so configuration errors fail during startup.
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
  // Both settings use development fallbacks but require explicit production values.
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
