import { describe, expect, it } from 'vitest'
import { findRedirect, toRedirectEntries } from './redirects'

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
