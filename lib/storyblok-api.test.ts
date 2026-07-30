import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { isStoryblokNotFound, resolveVersion } from './storyblok-api'

const { get, draftMode } = vi.hoisted(() => ({
  get: vi.fn(),
  draftMode: vi.fn(async () => ({ isEnabled: true })),
}))

vi.mock('next/headers', () => ({ draftMode }))
vi.mock('storyblok-js-client', () => ({
  default: class {
    get = get
  },
}))

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

// The point of the 404 narrowing: a CMS outage must not read as missing content.
describe('getStory failure semantics', () => {
  beforeEach(() => {
    vi.resetModules()
    get.mockReset()
    draftMode.mockClear()
  })

  afterEach(() => vi.unstubAllEnvs())

  it('returns null without contacting Storyblok when fetching is disabled', async () => {
    vi.stubEnv('STORYBLOK_SKIP_FETCH', 'true')
    const mod = await import('./storyblok-api')
    await expect(mod.getStory('home')).resolves.toBeNull()
    expect(get).not.toHaveBeenCalled()
    expect(draftMode).not.toHaveBeenCalled()
  })

  it('returns null for a genuine 404', async () => {
    get.mockRejectedValue({ status: 404 })
    const mod = await import('./storyblok-api')
    await expect(mod.getStory('missing')).resolves.toBeNull()
  })

  it('rethrows an operational failure instead of reporting it as missing', async () => {
    get.mockRejectedValue({ status: 401 })
    const mod = await import('./storyblok-api')
    await expect(mod.getStory('home')).rejects.toEqual({ status: 401 })
  })

  it('returns the story on success', async () => {
    get.mockResolvedValue({ data: { story: { name: 'Home' } } })
    const mod = await import('./storyblok-api')
    await expect(mod.getStory('home')).resolves.toEqual({ name: 'Home' })
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
    vi.stubEnv('NEXT_PUBLIC_STORYBLOK_TOKEN', 'test-token')
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
