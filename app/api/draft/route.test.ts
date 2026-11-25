import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, enable, redirect } = vi.hoisted(() => ({
  get: vi.fn(),
  enable: vi.fn(),
  redirect: vi.fn(),
}))
vi.mock('storyblok-js-client', () => ({
  default: class {
    get = get
  },
}))
vi.mock('next/headers', () => ({ draftMode: async () => ({ enable, isEnabled: false }) }))
vi.mock('next/navigation', async importOriginal => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  redirect,
}))

const call = async (query: string) => {
  const { GET } = await import('./route')
  return GET(new Request(`https://example.test/api/draft?${query}`))
}

describe('/api/draft', () => {
  beforeEach(() => vi.clearAllMocks())

  it('rejects a wrong secret before reading anything', async () => {
    expect((await call('secret=nope&slug=about'))?.status).toBe(401)
    expect(get).not.toHaveBeenCalled()
  })

  it('answers 401 for a slug Storyblok does not know', async () => {
    get.mockRejectedValue({ status: 404 })
    expect((await call('secret=test-secret&slug=missing'))?.status).toBe(401)
    expect(enable).not.toHaveBeenCalled()
  })

  it('sends the home story to / and forwards only bridge params', async () => {
    get.mockResolvedValue({ data: { story: { full_slug: 'home' } } })
    await call('secret=test-secret&slug=home&_storyblok=1')
    expect(enable).toHaveBeenCalled()
    expect(redirect).toHaveBeenCalledWith('/?_storyblok=1')
  })
})
