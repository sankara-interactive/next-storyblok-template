import { describe, expect, it, vi } from 'vitest'
import { SITE_NAME } from '@/lib/config'

const { getStory } = vi.hoisted(() => ({ getStory: vi.fn() }))
vi.mock('@/lib/storyblok-api', () => ({ getStory, getAllLinks: vi.fn() }))

const metadataFor = async (locale: string, slug?: string[]) => {
  const { generateMetadata } = await import('./page')
  return generateMetadata({
    params: Promise.resolve({ locale, slug }),
    searchParams: Promise.resolve({}),
  })
}

// Next replaces `openGraph` instead of merging it, so the defaults must be re-spread here.
describe('generateMetadata', () => {
  it('keeps the layout openGraph defaults on content routes', async () => {
    getStory.mockResolvedValue({ name: 'About', content: { seo: { title: 'About us' } } })

    expect((await metadataFor('de', ['about'])).openGraph).toMatchObject({
      siteName: SITE_NAME,
      locale: 'de_CH',
      type: 'website',
      title: 'About us',
      url: '/about',
    })
  })

  it('leaves the default locale unprefixed and maps home to /', async () => {
    getStory.mockResolvedValue({ name: 'Home', content: {} })

    expect((await metadataFor('de')).alternates?.canonical).toBe('/')
    expect((await metadataFor('de', ['about'])).alternates?.canonical).toBe('/about')
  })

  it('emits no hreflang alternates while only one locale is configured', async () => {
    getStory.mockResolvedValue({ name: 'About', content: {} })

    expect((await metadataFor('de', ['about'])).alternates?.languages).toBeUndefined()
  })

  it('passes the locale through to the story fetch', async () => {
    getStory.mockResolvedValue({ name: 'About', content: {} })
    await metadataFor('de', ['about'])

    expect(getStory).toHaveBeenCalledWith('about', 'de')
  })
})
