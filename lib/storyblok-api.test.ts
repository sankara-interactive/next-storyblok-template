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

describe('resolveVersion MODE=preview override', () => {
  it('forces draft when MODE=preview regardless of isDraft', async () => {
    vi.resetModules()
    const prevMode = process.env.MODE
    const prevNode = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    process.env.MODE = 'preview'
    const mod = await import('./storyblok-api')
    expect(mod.resolveVersion(false)).toBe('draft')
    process.env.MODE = prevMode
    process.env.NODE_ENV = prevNode
    vi.resetModules()
  })
})
