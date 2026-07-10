import { describe, expect, it } from 'vitest'
import type { StoryblokMultilink } from '@/.storyblok/types/storyblok'
import { getHref } from './getHref'

const link = (o: Partial<StoryblokMultilink>) => o as StoryblokMultilink

describe('getHref', () => {
  it('resolves a story link by full_slug', () => {
    expect(
      getHref(
        link({
          linktype: 'story',
          story: { full_slug: 'about/team' } as never,
          cached_url: 'about/team',
        })
      )
    ).toBe('/about/team')
  })
  it('falls back to cached_url when the story is not resolved', () => {
    expect(getHref(link({ linktype: 'story', cached_url: 'about' }))).toBe('/about')
  })
  it('appends an anchor to story links', () => {
    expect(getHref(link({ linktype: 'story', cached_url: 'home', anchor: 'cta' }))).toBe(
      '/home#cta'
    )
  })
  it('resolves url, asset, and email links', () => {
    expect(getHref(link({ linktype: 'url', url: 'https://x.com' }))).toBe('https://x.com')
    expect(getHref(link({ linktype: 'asset', url: 'https://a.com/f.pdf' }))).toBe(
      'https://a.com/f.pdf'
    )
    expect(getHref(link({ linktype: 'email', email: 'a@b.ch' }))).toBe('mailto:a@b.ch')
  })
})
