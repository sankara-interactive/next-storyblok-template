import { afterEach, describe, expect, it, vi } from 'vitest'
import { isStoryblokNotFound, resolveVersion } from './storyblok-api'

describe('resolveVersion', () => {
  it('returns draft when draft mode is on', () => {
    expect(resolveVersion(true)).toBe('draft')
  })
  it('returns published otherwise', () => {
    expect(resolveVersion(false)).toBe('published')
  })
})

describe('isStoryblokNotFound', () => {
  it('recognizes direct and response status codes', () => {
    expect(isStoryblokNotFound({ status: 404 })).toBe(true)
    expect(isStoryblokNotFound({ response: { status: 404 } })).toBe(true)
  })

  it('does not hide operational or unknown failures', () => {
    expect(isStoryblokNotFound({ status: 401 })).toBe(false)
    expect(isStoryblokNotFound(new Error('network unavailable'))).toBe(false)
    expect(isStoryblokNotFound(null)).toBe(false)
  })
})

describe('resolveVersion env overrides', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('forces draft in development regardless of isDraft', async () => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'development')
    const mod = await import('./storyblok-api')
    expect(mod.resolveVersion(false)).toBe('draft')
  })

  it('forces draft when MODE=preview regardless of isDraft', async () => {
    vi.resetModules()
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('MODE', 'preview')
    vi.stubEnv('SITE_URL', 'https://example.com')
    vi.stubEnv('SITE_NAME', 'Test')
    vi.stubEnv('NEXT_PUBLIC_STORYBLOK_TOKEN', 'test-token')
    const mod = await import('./storyblok-api')
    expect(mod.resolveVersion(false)).toBe('draft')
  })
})
