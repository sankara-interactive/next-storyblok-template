import { describe, expect, it } from 'vitest'
import { parseArgs } from './setup-space.mjs'

describe('setup:space arguments', () => {
  it('parses an explicit space and confirmation', () => {
    expect(parseArgs(['--space', '12345', '--yes'])).toEqual({
      space: '12345',
      yes: true,
      force: false,
    })
  })

  it('rejects a missing --space rather than falling back to the environment', () => {
    process.env.STORYBLOK_SPACE_ID = '202685'
    expect(() => parseArgs(['--yes'])).toThrow(/--space/)
  })

  it('rejects a non-numeric space', () => {
    expect(() => parseArgs(['--space', 'baseline', '--yes'])).toThrow(/numeric/)
  })

  it('defaults --yes to false so a bare invocation cannot mutate a space', () => {
    expect(parseArgs(['--space', '12345']).yes).toBe(false)
  })

  it('defaults --force to false', () => {
    expect(parseArgs(['--space', '12345', '--yes']).force).toBe(false)
  })

  it('parses --force when present', () => {
    expect(parseArgs(['--space', '12345', '--yes', '--force']).force).toBe(true)
  })
})
