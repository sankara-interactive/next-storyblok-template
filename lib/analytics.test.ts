import { describe, expect, it } from 'vitest'
import { pirschAttributes } from './analytics'

describe('pirschAttributes', () => {
  it('returns script attributes when a code is set', () => {
    expect(pirschAttributes('ABC123')).toEqual({
      id: 'pirschjs',
      src: 'https://api.pirsch.io/pirsch.js',
      'data-code': 'ABC123',
    })
  })
  it('returns null when no code', () => {
    expect(pirschAttributes(undefined)).toBeNull()
    expect(pirschAttributes('')).toBeNull()
  })
})
