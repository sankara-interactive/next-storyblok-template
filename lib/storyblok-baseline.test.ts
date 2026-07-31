import { describe, expect, it } from 'vitest'
import { components } from './storyblok'
import { loadBaseline, whitelistedBloks, renderableBloks } from './storyblok-baseline'

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
    // Pins the fixture: without this, the loop below is vacuously true if
    // e.g. `tab-seo` were deleted from the baseline.
    expect(byName.get('page')!.schema['tab-seo']).toBeDefined()
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

describe('registry coverage', () => {
  it('every renderable blok has a registry key', () => {
    for (const name of renderableBloks()) {
      expect(name in components, `${name} is renderable but missing from lib/storyblok.ts`).toBe(
        true
      )
    }
  })

  it('exempts data-only bloks', () => {
    expect(renderableBloks()).not.toContain('redirect')
    expect(renderableBloks()).toContain('text_section')
  })
})
