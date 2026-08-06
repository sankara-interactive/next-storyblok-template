import { describe, expect, it } from 'vitest'
import { isDataRoute, revalidationTags } from './storyblok-routes'

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

describe('revalidationTags', () => {
  it('busts the story and the links inventory on a content publish', () => {
    expect(revalidationTags('published', 'about')).toEqual(['storyblok:about', 'storyblok:links'])
    expect(revalidationTags('published', 'home')).toEqual(['storyblok:home', 'storyblok:links'])
  })
  it('normalizes the trailing slash of folder startpages', () => {
    expect(revalidationTags('published', 'about/')).toEqual(['storyblok:about', 'storyblok:links'])
  })
  it('flushes everything for a data/ global', () => {
    expect(revalidationTags('published', 'data/menu')).toEqual(['storyblok'])
  })
  it('flushes everything for structural actions', () => {
    expect(revalidationTags('moved', 'about')).toEqual(['storyblok'])
    expect(revalidationTags('deleted', 'about')).toEqual(['storyblok'])
    expect(revalidationTags('unpublished', 'about')).toEqual(['storyblok'])
  })
  it('flushes everything when the slug is missing', () => {
    expect(revalidationTags('published', undefined)).toEqual(['storyblok'])
    expect(revalidationTags(undefined, undefined)).toEqual(['storyblok'])
  })
})
