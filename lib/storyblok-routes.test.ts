import { describe, expect, it } from 'vitest'
import { isDataRoute } from './storyblok-routes'

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
