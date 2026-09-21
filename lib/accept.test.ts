import { describe, expect, it } from 'vitest'
import { negotiate } from './accept'

describe('negotiate', () => {
  it('defaults to html without a usable header', () => {
    expect(negotiate(null)).toBe('html')
    expect(negotiate('')).toBe('html')
    expect(negotiate('garbage')).toBe('html')
  })

  it('serves html to a browser', () => {
    expect(negotiate('text/html,application/xhtml+xml,*/*;q=0.8')).toBe('html')
  })

  it('serves markdown when the agent prefers it', () => {
    expect(negotiate('text/markdown')).toBe('markdown')
    expect(negotiate('text/markdown,text/html;q=0.5')).toBe('markdown')
    expect(negotiate('text/x-markdown')).toBe('markdown')
  })

  it('never serves markdown on a wildcard alone', () => {
    expect(negotiate('*/*')).toBe('html')
  })

  it('honours a more specific q=0 over a wildcard', () => {
    expect(negotiate('text/markdown;q=0, */*')).toBe('html')
    expect(negotiate('text/html;q=0, text/markdown')).toBe('markdown')
  })

  it('breaks an exact tie toward html', () => {
    expect(negotiate('text/markdown;q=0.9,text/html;q=0.9')).toBe('html')
  })

  it("treats Next's own RSC content type as html", () => {
    expect(negotiate('text/x-component')).toBe('html')
    expect(negotiate('text/x-component,text/markdown')).toBe('html')
  })

  it('reports none when the client accepts neither', () => {
    expect(negotiate('image/png')).toBe('none')
    expect(negotiate('text/html;q=0,text/markdown;q=0')).toBe('none')
  })
})
