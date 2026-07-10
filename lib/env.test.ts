import { describe, expect, it } from 'vitest'
import { isContentFetchDisabled, readDeliveryToken, readSiteEnv, requireEnv } from './env'

describe('environment validation', () => {
  it('uses local site defaults outside production', () => {
    expect(readSiteEnv({ NODE_ENV: 'development' })).toEqual({
      siteUrl: 'http://localhost:3000',
      siteName: 'Site',
    })
  })

  it('requires an HTTPS site identity in production', () => {
    expect(() => readSiteEnv({ NODE_ENV: 'production' })).toThrow('SITE_URL')
    expect(() =>
      readSiteEnv({ NODE_ENV: 'production', SITE_URL: 'http://example.com', SITE_NAME: 'Example' })
    ).toThrow('HTTPS')
    expect(
      readSiteEnv({
        NODE_ENV: 'production',
        SITE_URL: 'https://example.com/path',
        SITE_NAME: 'Example',
      })
    ).toEqual({ siteUrl: 'https://example.com', siteName: 'Example' })
  })

  it('rejects invalid and blank values', () => {
    expect(() => readSiteEnv({ SITE_URL: 'not a URL' })).toThrow('absolute URL')
    expect(() => requireEnv('SECRET', { SECRET: '  ' })).toThrow('SECRET')
  })

  it('requires a delivery token only in production', () => {
    expect(readDeliveryToken({ NODE_ENV: 'development' })).toBeUndefined()
    expect(() => readDeliveryToken({ NODE_ENV: 'production' })).toThrow(
      'NEXT_PUBLIC_STORYBLOK_TOKEN'
    )
  })

  it('disables content fetching only for an explicit opt-in', () => {
    expect(isContentFetchDisabled({})).toBe(false)
    expect(isContentFetchDisabled({ STORYBLOK_SKIP_FETCH: 'false' })).toBe(false)
    expect(isContentFetchDisabled({ STORYBLOK_SKIP_FETCH: 'true' })).toBe(true)
  })
})
