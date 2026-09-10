import { afterEach, describe, expect, it, vi } from 'vitest'
import { isDataRoute, isTranslatedSlug, revalidationTags } from './storyblok-routes'

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

describe('isTranslatedSlug', () => {
  it('is false for plain and default-locale slugs', () => {
    expect(isTranslatedSlug('about')).toBe(false)
    expect(isTranslatedSlug('de/about')).toBe(false)
    expect(isTranslatedSlug('data/menu')).toBe(false)
  })

  it('is false while only the default locale is configured', () => {
    expect(isTranslatedSlug('fr/accueil')).toBe(false)
  })
})

// The guard is dormant at LOCALES = ['de'], so the behaviour that matters —
// what happens once a project adds a locale — is exercised against a config
// that has one. Without this a French publish flushes nothing at all.
describe('with a second locale configured', () => {
  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('./config')
  })

  const withLocales = async () => {
    vi.resetModules()
    vi.doMock('./config', async () => ({
      ...(await vi.importActual<typeof import('./config')>('./config')),
      LOCALES: ['de', 'fr'] as const,
      DEFAULT_LOCALE: 'de',
    }))
    return import('./storyblok-routes')
  }

  it('flags a translated slug', async () => {
    const routes = await withLocales()
    expect(routes.isTranslatedSlug('fr/accueil')).toBe(true)
    expect(routes.isTranslatedSlug('de/ueber-uns')).toBe(false)
    expect(routes.isTranslatedSlug('about')).toBe(false)
  })

  it('flushes globally on a translated publish instead of a tag that matches nothing', async () => {
    const routes = await withLocales()
    expect(routes.revalidationTags('published', 'fr/accueil')).toEqual(['storyblok'])
  })

  it('still flushes surgically on a default-locale publish', async () => {
    const routes = await withLocales()
    expect(routes.revalidationTags('published', 'about')).toEqual([
      'storyblok:about',
      'storyblok:links',
    ])
  })
})
