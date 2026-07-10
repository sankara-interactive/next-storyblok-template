import { describe, expect, it } from 'vitest'
import {
  booleanStringSchema,
  requireEnv,
  resolveDeliveryToken,
  siteNameSchema,
  siteUrlSchema,
} from './env'

describe('environment validation', () => {
  it('uses local site defaults outside production', () => {
    expect(siteUrlSchema(false).parse(undefined)).toBe('http://localhost:3000')
    expect(siteNameSchema(false).parse(undefined)).toBe('Site')
  })

  it('requires an HTTPS site identity in production', () => {
    expect(() => siteUrlSchema(true).parse(undefined)).toThrow()
    expect(() => siteNameSchema(true).parse(undefined)).toThrow()
    expect(() => siteUrlSchema(true).parse('http://example.com')).toThrow('HTTPS')
    expect(siteUrlSchema(true).parse('https://example.com/path')).toBe('https://example.com')
  })

  it('rejects invalid and blank values', () => {
    expect(() => siteUrlSchema(false).parse('not a URL')).toThrow()
    expect(() => requireEnv('SECRET', undefined)).toThrow('SECRET')
  })

  it('requires a delivery token only in production', () => {
    expect(resolveDeliveryToken('development', undefined)).toBeUndefined()
    expect(resolveDeliveryToken('test', undefined)).toBe('test-token')
    expect(() => resolveDeliveryToken('production', undefined)).toThrow(
      'NEXT_PUBLIC_STORYBLOK_TOKEN'
    )
  })

  it('parses explicit boolean strings', () => {
    expect(booleanStringSchema.parse(undefined)).toBe(false)
    expect(booleanStringSchema.parse('false')).toBe(false)
    expect(booleanStringSchema.parse('true')).toBe(true)
  })
})
