import { afterEach, describe, expect, it, vi } from 'vitest'
import { resolveVersion } from './storyblok-api'

describe('resolveVersion', () => {
  it('returns draft when draft mode is on', () => {
    expect(resolveVersion(true)).toBe('draft')
  })
  it('returns published otherwise', () => {
    expect(resolveVersion(false)).toBe('published')
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
    const mod = await import('./storyblok-api')
    expect(mod.resolveVersion(false)).toBe('draft')
  })
})
