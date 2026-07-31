import { describe, expect, it } from 'vitest'
import { loadBaseline, whitelistedBloks } from './storyblok-baseline'

const baseline = loadBaseline()
const byName = new Map(baseline.map(c => [c.name, c]))

describe('baseline schema', () => {
  it('contains the four expected components', () => {
    expect([...byName.keys()].sort()).toEqual(['page', 'redirect', 'redirects', 'text_section'])
  })

  it('every whitelisted blok exists in the file', () => {
    for (const component of baseline) {
      for (const child of whitelistedBloks(component)) {
        expect(byName.has(child), `${component.name} whitelists missing blok ${child}`).toBe(true)
      }
    }
  })

  it('whitelisted bloks are nestable, never content types', () => {
    for (const component of baseline) {
      for (const child of whitelistedBloks(component)) {
        expect(byName.get(child)!.is_nestable, `${child} must be nestable`).toBe(true)
        expect(byName.get(child)!.is_root, `${child} must not be a content type`).toBe(false)
      }
    }
  })

  it('tab keys reference fields that exist', () => {
    for (const component of baseline) {
      for (const [name, field] of Object.entries(component.schema)) {
        if (field.type !== 'tab') continue
        for (const key of field.keys ?? []) {
          expect(
            key in component.schema,
            `${component.name} tab ${name} references missing ${key}`
          ).toBe(true)
        }
      }
    }
  })
})
