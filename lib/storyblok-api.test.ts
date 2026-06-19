import { describe, expect, it, vi } from 'vitest'
import { resolveVersion } from './storyblok-api'

describe('resolveVersion', () => {
  it('returns draft when draft mode is on', () => {
    expect(resolveVersion(true)).toBe('draft')
  })
  it('returns published otherwise', () => {
    expect(resolveVersion(false)).toBe('published')
  })
})

describe('resolveVersion NODE_ENV override', () => {
  it('forces draft in development regardless of isDraft', async () => {
    vi.resetModules()
    const prev = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    const mod = await import('./storyblok-api')
    expect(mod.resolveVersion(false)).toBe('draft')
    process.env.NODE_ENV = prev
    vi.resetModules()
  })
})
