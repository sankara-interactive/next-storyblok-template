import { describe, expect, it } from 'vitest'
// @ts-expect-error - plain JS module
import { toNextRedirects } from './redirects.mjs'

describe('toNextRedirects', () => {
  it('maps valid entries and defaults to permanent', () => {
    const out = toNextRedirects([
      { source: '/alt', destination: '/neu' },
      { source: '/tmp', destination: '/ziel', permanent: false },
    ])
    expect(out).toEqual([
      { source: '/alt', destination: '/neu', permanent: true },
      { source: '/tmp', destination: '/ziel', permanent: false },
    ])
  })
  it('drops entries missing source or destination', () => {
    expect(toNextRedirects([{ source: '/x' }, { destination: '/y' }, {}])).toEqual([])
  })
  it('tolerates non-array input', () => {
    expect(toNextRedirects(undefined)).toEqual([])
  })
})
