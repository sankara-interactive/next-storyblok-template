import { describe, expect, it } from 'vitest'
import { bridgeParams } from './draft'

describe('bridgeParams', () => {
  it('keeps only _storyblok* params', () => {
    const sp = new URLSearchParams(
      'secret=abc&slug=home&_storyblok=1&_storyblok_tk[token]=x&foo=bar',
    )
    const out = new URLSearchParams(bridgeParams(sp))
    expect(out.get('secret')).toBeNull()
    expect(out.get('slug')).toBeNull()
    expect(out.get('foo')).toBeNull()
    expect(out.get('_storyblok')).toBe('1')
    expect(out.get('_storyblok_tk[token]')).toBe('x')
  })
})
