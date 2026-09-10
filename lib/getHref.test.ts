import { describe, expect, it } from 'vitest'
import type { StoryblokMultilink } from '@/.storyblok/types/storyblok'
import { getHref } from './getHref'

const link = (o: Partial<StoryblokMultilink>) => o as StoryblokMultilink
const story = (o: Partial<StoryblokMultilink>) => link({ linktype: 'story', ...o })

describe('getHref', () => {
  it('resolves a story link by full_slug', () => {
    expect(
      getHref(story({ story: { full_slug: 'about/team' } as never, cached_url: 'about/team' }))
    ).toBe('/about/team')
  })

  it('falls back to cached_url when the story is not resolved', () => {
    expect(getHref(story({ cached_url: 'about' }))).toBe('/about')
  })

  it('appends an anchor to story links', () => {
    expect(getHref(story({ cached_url: 'about', anchor: 'cta' }))).toBe('/about#cta')
  })

  it('resolves url, asset, and email links', () => {
    expect(getHref(link({ linktype: 'url', url: 'https://x.com' }))).toBe('https://x.com')
    expect(getHref(link({ linktype: 'asset', url: 'https://a.com/f.pdf' }))).toBe(
      'https://a.com/f.pdf'
    )
    expect(getHref(link({ linktype: 'email', email: 'a@b.ch' }))).toBe('mailto:a@b.ch')
  })

  describe('the root story', () => {
    it('is / and never /home, which is a reachable duplicate the sitemap omits', () => {
      expect(getHref(story({ cached_url: 'home' }))).toBe('/')
      expect(getHref(story({ story: { full_slug: 'home' } as never }))).toBe('/')
    })

    it('keeps a leading slash before an anchor, never a bare fragment', () => {
      expect(getHref(story({ cached_url: 'home', anchor: 'cta' }))).toBe('/#cta')
    })

    it('handles the trailing slash Storyblok sends for folder startpages', () => {
      expect(getHref(story({ cached_url: 'home/' }))).toBe('/')
      expect(getHref(story({ cached_url: 'about/' }))).toBe('/about')
    })

    it('does not special-case a story merely named home inside a folder', () => {
      expect(getHref(story({ cached_url: 'about/home' }))).toBe('/about/home')
    })
  })
})
