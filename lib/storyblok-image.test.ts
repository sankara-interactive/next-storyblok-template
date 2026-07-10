import { describe, expect, it } from 'vitest'
import { storyblokImageDimensions, storyblokImageLoader } from './storyblok-image'

const url = 'https://a.storyblok.com/f/123/1600x900/abcdef/hero.jpg'

describe('storyblokImageDimensions', () => {
  it('parses width and height', () => {
    expect(storyblokImageDimensions(url)).toEqual({ width: 1600, height: 900 })
  })
  it('returns null when absent', () => {
    expect(storyblokImageDimensions('https://a.storyblok.com/x/hero.jpg')).toBeNull()
  })
})

describe('storyblokImageLoader', () => {
  it('builds a resized webp url', () => {
    expect(storyblokImageLoader({ src: url, width: 800, quality: 70 })).toBe(
      `${url}/m/800x0/filters:format(webp):quality(70)`
    )
  })
  it('defaults quality to 75', () => {
    expect(storyblokImageLoader({ src: url, width: 400 })).toBe(
      `${url}/m/400x0/filters:format(webp):quality(75)`
    )
  })
})
