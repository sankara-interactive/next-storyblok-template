import { describe, expect, it } from 'vitest'
import { isDataRoute, revalidationTag } from './storyblok-routes'

describe('isDataRoute', () => {
  it('flags the data folder root', () => {
    expect(isDataRoute('data')).toBe(true)
  })
  it('flags stories under data/', () => {
    expect(isDataRoute('data/menu')).toBe(true)
    expect(isDataRoute('data/team/jane')).toBe(true)
  })
  it('does not flag normal pages', () => {
    expect(isDataRoute('home')).toBe(false)
    expect(isDataRoute('datenschutz')).toBe(false) // prefix collision guard
    expect(isDataRoute('about/data')).toBe(false)
  })
})

describe('revalidationTag', () => {
  it('busts only the story on a content publish', () => {
    expect(revalidationTag('published', 'about')).toBe('storyblok:about')
    expect(revalidationTag('published', 'home')).toBe('storyblok:home')
  })
  it('flushes everything for a data/ global', () => {
    expect(revalidationTag('published', 'data/menu')).toBe('storyblok')
  })
  it('flushes everything for structural actions', () => {
    expect(revalidationTag('moved', 'about')).toBe('storyblok')
    expect(revalidationTag('deleted', 'about')).toBe('storyblok')
    expect(revalidationTag('unpublished', 'about')).toBe('storyblok')
  })
  it('flushes everything when the slug is missing', () => {
    expect(revalidationTag('published', undefined)).toBe('storyblok')
    expect(revalidationTag(undefined, undefined)).toBe('storyblok')
  })
})
