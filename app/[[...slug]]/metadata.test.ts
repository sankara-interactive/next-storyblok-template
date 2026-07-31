import { describe, expect, it, vi } from 'vitest'
import { SITE_NAME } from '@/lib/config'

const { getStory } = vi.hoisted(() => ({ getStory: vi.fn() }))
vi.mock('@/lib/storyblok-api', () => ({ getStory, getAllLinks: vi.fn() }))

// Next replaces `openGraph` instead of merging it, so the defaults must be re-spread here.
describe('generateMetadata', () => {
  it('keeps the layout openGraph defaults on content routes', async () => {
    getStory.mockResolvedValue({ name: 'About', content: { seo: { title: 'About us' } } })
    const { generateMetadata } = await import('./page')

    const metadata = await generateMetadata({
      params: Promise.resolve({ slug: ['about'] }),
      searchParams: Promise.resolve({}),
    })

    expect(metadata.openGraph).toMatchObject({
      siteName: SITE_NAME,
      locale: 'de_CH',
      type: 'website',
      title: 'About us',
      url: '/about',
    })
  })
})
