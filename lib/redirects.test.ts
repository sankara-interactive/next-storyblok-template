import { describe, expect, it } from 'vitest'
import { findRedirect, queryString, toRedirectEntries, withQuery } from './redirects'

describe('toRedirectEntries', () => {
  it('maps valid entries and defaults to permanent', () => {
    expect(
      toRedirectEntries([
        { source: '/alt', destination: '/neu' },
        { source: '/tmp', destination: '/ziel', permanent: false },
      ])
    ).toEqual([
      { source: '/alt', destination: '/neu', permanent: true },
      { source: '/tmp', destination: '/ziel', permanent: false },
    ])
  })

  it('normalizes a missing leading slash and a trailing one', () => {
    expect(toRedirectEntries([{ source: 'alt/pfad/', destination: '/neu' }])[0].source).toBe(
      '/alt/pfad'
    )
  })

  it('drops entries missing source or destination', () => {
    expect(toRedirectEntries([{ source: '/x' }, { destination: '/y' }, {}])).toEqual([])
  })

  it('tolerates non-array input', () => {
    expect(toRedirectEntries(undefined)).toEqual([])
  })

  // A blank source normalizes to '/' and would claim the homepage; a blank
  // destination would redirect onto the current URL.
  it('drops entries whose fields are blank or whitespace', () => {
    expect(
      toRedirectEntries([
        { source: '   ', destination: '/neu' },
        { source: '/alt', destination: '  ' },
      ])
    ).toEqual([])
  })
})

describe('findRedirect', () => {
  const entries = toRedirectEntries([
    { source: '/alt', destination: '/neu' },
    { source: '/impressum.html', destination: '/impressum', permanent: false },
  ])

  it('matches an exact path', () => {
    expect(findRedirect(entries, '/alt')?.destination).toBe('/neu')
  })

  it('matches a path containing a dot', () => {
    expect(findRedirect(entries, '/impressum.html')?.permanent).toBe(false)
  })

  it('ignores a trailing slash on the request', () => {
    expect(findRedirect(entries, '/alt/')?.destination).toBe('/neu')
  })

  it('returns null when nothing matches', () => {
    expect(findRedirect(entries, '/nichts')).toBeNull()
  })

  it('does not match on a prefix', () => {
    expect(findRedirect(entries, '/alt/tiefer')).toBeNull()
  })
})

describe('withQuery', () => {
  it('carries the incoming query onto the destination', () => {
    expect(withQuery('/neu', 'utm_source=mail')).toBe('/neu?utm_source=mail')
  })

  it('appends when the destination has its own query', () => {
    expect(withQuery('/neu?ref=alt', 'utm_source=mail')).toBe('/neu?ref=alt&utm_source=mail')
  })

  it('leaves the destination alone without a query', () => {
    expect(withQuery('/neu', '')).toBe('/neu')
  })

  it('inserts the query before a fragment', () => {
    expect(withQuery('/neu#details', 'utm_source=mail')).toBe('/neu?utm_source=mail#details')
  })

  it('inserts the query before a fragment when the destination has its own', () => {
    expect(withQuery('/neu?ref=alt#details', 'utm_source=mail')).toBe(
      '/neu?ref=alt&utm_source=mail#details'
    )
  })
})

describe('queryString', () => {
  it('serializes scalars, repeats arrays, and skips undefined', () => {
    expect(queryString({ a: '1', b: ['x', 'y'], c: undefined })).toBe('a=1&b=x&b=y')
  })

  it('encodes reserved characters', () => {
    expect(queryString({ q: 'a b&c' })).toBe('q=a+b%26c')
  })
})
