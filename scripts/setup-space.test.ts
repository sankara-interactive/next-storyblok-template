import { describe, expect, it, vi } from 'vitest'
import { parseArgs, requireEmptySpace, requireSession } from './setup-space.mjs'

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

describe('requireSession', () => {
  it('passes through when the CLI reports a logged-in session', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const checkSession = () => ({ status: 0, stdout: 'you are currently logged in', stderr: '' })

    requireSession({ checkSession })

    expect(exit).not.toHaveBeenCalled()
    exit.mockRestore()
  })

  it('exits when there is no CLI session, without shelling out', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const checkSession = () => ({ status: 1, stdout: '', stderr: '' })

    requireSession({ checkSession })

    expect(exit).toHaveBeenCalledWith(1)
    exit.mockRestore()
    error.mockRestore()
  })
})

describe('requireEmptySpace', () => {
  it('passes through when the space has no stories', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const listStories = () => []

    requireEmptySpace('12345', false, { listStories })

    expect(exit).not.toHaveBeenCalled()
    exit.mockRestore()
  })

  it('refuses when the space already has stories, without a network call', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const listStories = () => [
      { full_slug: 'home', id: 111 },
      { full_slug: 'about', id: 222 },
    ]

    requireEmptySpace('12345', false, { listStories })

    expect(exit).toHaveBeenCalledWith(1)
    expect(error.mock.calls[0][0]).toMatch(/already contains 2 stories/)
    expect(error.mock.calls[0][0]).toMatch(/home \(id 111\)/)
    exit.mockRestore()
    error.mockRestore()
  })

  it('continues past existing stories when --force is set', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const listStories = () => [{ full_slug: 'home', id: 111 }]

    requireEmptySpace('12345', true, { listStories })

    expect(exit).not.toHaveBeenCalled()
    exit.mockRestore()
    error.mockRestore()
  })
})
