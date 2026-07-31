import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import {
  isLikelyPublishQuotaFailure,
  parseArgs,
  readLatestReport,
  requireComponentsPushed,
  requireEmptySpace,
  requireFreshReport,
  requireSession,
} from './setup-space.mjs'

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
  let exit: MockInstance<typeof process.exit>
  let error: MockInstance<typeof console.error>

  beforeEach(() => {
    exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes through when the CLI reports a logged-in session', () => {
    const checkSession = () => ({ status: 0, stdout: 'you are currently logged in', stderr: '' })

    requireSession({ checkSession })

    expect(exit).not.toHaveBeenCalled()
  })

  it('exits when there is no CLI session, without shelling out', () => {
    const checkSession = () => ({ status: 1, stdout: '', stderr: '' })

    requireSession({ checkSession })

    expect(exit).toHaveBeenCalledWith(1)
  })
})

const BASELINE_SLUGS = ['home', 'about', 'data', 'data/redirects']

describe('requireEmptySpace', () => {
  let exit: MockInstance<typeof process.exit>
  let error: MockInstance<typeof console.error>

  beforeEach(() => {
    exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes through when the space has no stories', () => {
    const listStories = () => []

    requireEmptySpace('12345', false, { listStories, baselineSlugs: () => BASELINE_SLUGS })

    expect(exit).not.toHaveBeenCalled()
  })

  it('passes through when the space contains only baseline slugs (starter space or repeat run)', () => {
    const listStories = () => [
      { full_slug: 'home', id: 111 },
      { full_slug: 'about', id: 222 },
      { full_slug: 'data', id: 333 },
      { full_slug: 'data/redirects', id: 444 },
    ]

    requireEmptySpace('12345', false, { listStories, baselineSlugs: () => BASELINE_SLUGS })

    expect(exit).not.toHaveBeenCalled()
  })

  it('refuses when the space contains a story outside the baseline set, without a network call', () => {
    const listStories = () => [
      { full_slug: 'home', id: 111 },
      { full_slug: 'contact', id: 555 },
    ]

    requireEmptySpace('12345', false, { listStories, baselineSlugs: () => BASELINE_SLUGS })

    expect(exit).toHaveBeenCalledWith(1)
    expect(error.mock.calls[0][0]).toMatch(/already contains 1 story/)
    expect(error.mock.calls[0][0]).toMatch(/contact \(id 555\)/)
    expect(error.mock.calls[0][0]).not.toMatch(/home \(id 111\)/)
  })

  it('continues past unexpected stories when --force is set', () => {
    const listStories = () => [{ full_slug: 'contact', id: 555 }]

    requireEmptySpace('12345', true, { listStories, baselineSlugs: () => BASELINE_SLUGS })

    expect(exit).not.toHaveBeenCalled()
  })

  it('refuses when the emptiness check itself fails, rather than treating it as empty (C1)', () => {
    const listStories = () => {
      throw new Error(
        '`storyblok stories pull` did not report success for space 12345 (status: FAILURE).'
      )
    }

    requireEmptySpace('12345', false, { listStories, baselineSlugs: () => BASELINE_SLUGS })

    expect(exit).toHaveBeenCalledWith(1)
    expect(error.mock.calls[0][0]).toMatch(/Could not confirm space 12345 is safe to push into/)
    expect(error.mock.calls[0][0]).toMatch(
      /FAILED — that is not the same as the space being\nempty/
    )
  })

  it('lets --force override a failed check, but says so explicitly rather than claiming empty', () => {
    const listStories = () => {
      throw new Error('no report was written')
    }

    requireEmptySpace('12345', true, { listStories, baselineSlugs: () => BASELINE_SLUGS })

    expect(exit).not.toHaveBeenCalled()
    expect(error.mock.calls.some(([message]) => /despite the check failing/.test(message))).toBe(
      true
    )
  })
})

describe('readLatestReport', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-space-report-test-'))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('returns null when the reports directory does not exist (CLI wrote nothing)', () => {
    expect(readLatestReport(path.join(dir, 'missing'), 'stories-pull')).toBeNull()
  })

  it('returns null when no file matches the command prefix', () => {
    fs.writeFileSync(path.join(dir, 'storyblok-components-push-100.json'), '{"status":"SUCCESS"}')
    expect(readLatestReport(dir, 'stories-pull')).toBeNull()
  })

  it('picks the newest report by run id, not by file listing order', () => {
    fs.writeFileSync(path.join(dir, 'storyblok-stories-pull-100.json'), '{"status":"FAILURE"}')
    fs.writeFileSync(path.join(dir, 'storyblok-stories-pull-300.json'), '{"status":"SUCCESS"}')
    fs.writeFileSync(
      path.join(dir, 'storyblok-stories-pull-200.json'),
      '{"status":"PARTIAL_SUCCESS"}'
    )

    expect(readLatestReport(dir, 'stories-pull')).toEqual({ status: 'SUCCESS' })
  })

  it('returns null for an unreadable / malformed report rather than throwing', () => {
    fs.writeFileSync(path.join(dir, 'storyblok-stories-pull-100.json'), 'not json')
    expect(readLatestReport(dir, 'stories-pull')).toBeNull()
  })
})

describe('isLikelyPublishQuotaFailure', () => {
  const quotaError =
    'The request was well-formed but was unable to be followed due to semantic errors'

  it('recognizes the Development-plan publish-quota signature: content saved, every publish failed the same way', () => {
    const report = {
      status: 'PARTIAL_SUCCESS',
      meta: {
        failedStories: [
          { full_slug: 'home', error: quotaError },
          { full_slug: 'about', error: quotaError },
        ],
      },
      summary: {
        creationResults: { failed: 0 },
        processResults: { failed: 0 },
        updateResults: { failed: 2 },
      },
    }

    expect(isLikelyPublishQuotaFailure(report)).toBe(true)
  })

  it('does not treat a plain SUCCESS as a quota failure', () => {
    expect(isLikelyPublishQuotaFailure({ status: 'SUCCESS' })).toBe(false)
  })

  it('does not treat a hard FAILURE as a quota failure', () => {
    expect(isLikelyPublishQuotaFailure({ status: 'FAILURE' })).toBe(false)
  })

  it('does not treat a content-creation failure as a quota failure, even if the error text matches', () => {
    const report = {
      status: 'PARTIAL_SUCCESS',
      meta: { failedStories: [{ full_slug: 'home', error: quotaError }] },
      summary: {
        creationResults: { failed: 1 },
        processResults: { failed: 1 },
        updateResults: { failed: 0 },
      },
    }

    expect(isLikelyPublishQuotaFailure(report)).toBe(false)
  })

  it('does not treat an unrelated error message as a quota failure', () => {
    const report = {
      status: 'PARTIAL_SUCCESS',
      meta: { failedStories: [{ full_slug: 'home', error: 'Not found' }] },
      summary: {
        creationResults: { failed: 0 },
        processResults: { failed: 0 },
        updateResults: { failed: 1 },
      },
    }

    expect(isLikelyPublishQuotaFailure(report)).toBe(false)
  })

  it('returns false for a missing report', () => {
    expect(isLikelyPublishQuotaFailure(null)).toBe(false)
  })
})

describe('requireComponentsPushed', () => {
  let exit: MockInstance<typeof process.exit>
  let error: MockInstance<typeof console.error>

  beforeEach(() => {
    exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('passes through when every baseline component is present in the pulled set, without a network call', () => {
    const pulledComponentNames = () => ['page', 'text_section', 'redirects', 'redirect']
    const baselineComponentNames = () => ['page', 'text_section']

    requireComponentsPushed('12345', { pulledComponentNames, baselineComponentNames })

    expect(exit).not.toHaveBeenCalled()
  })

  it('fails when a baseline component is missing from the pulled set, without a network call', () => {
    const pulledComponentNames = () => ['page']
    const baselineComponentNames = () => ['page', 'text_section', 'redirects']

    requireComponentsPushed('12345', { pulledComponentNames, baselineComponentNames })

    expect(exit).toHaveBeenCalledWith(1)
    expect(error.mock.calls[0][0]).toMatch(/missing from the space after push/)
    expect(error.mock.calls[0][0]).toMatch(/- text_section/)
    expect(error.mock.calls[0][0]).toMatch(/- redirects/)
    expect(error.mock.calls[0][0]).not.toMatch(/- page/)
  })
})

describe('requireFreshReport', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-space-fresh-report-test-'))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('refuses when no report newer than the snapshot appeared (e.g. requireAuthentication early-returned)', () => {
    fs.writeFileSync(path.join(dir, 'storyblok-stories-push-100.json'), '{"status":"SUCCESS"}')

    // Snapshot taken equal to the newest report that already existed before the push:
    // simulates a push that produced no new report at all.
    expect(() => requireFreshReport(dir, 'stories-push', 100)).toThrow(/produced no new report/)
  })

  it('refuses when the reports directory does not exist at all', () => {
    expect(() => requireFreshReport(path.join(dir, 'missing'), 'stories-push', null)).toThrow(
      /produced no new report/
    )
  })

  it('returns the new report when its runId is strictly newer than the snapshot', () => {
    fs.writeFileSync(path.join(dir, 'storyblok-stories-push-100.json'), '{"status":"FAILURE"}')
    fs.writeFileSync(path.join(dir, 'storyblok-stories-push-200.json'), '{"status":"SUCCESS"}')

    expect(requireFreshReport(dir, 'stories-push', 100)).toEqual({ status: 'SUCCESS' })
  })

  it('accepts any report on a first-ever run (no prior snapshot)', () => {
    fs.writeFileSync(path.join(dir, 'storyblok-stories-push-100.json'), '{"status":"SUCCESS"}')

    expect(requireFreshReport(dir, 'stories-push', null)).toEqual({ status: 'SUCCESS' })
  })
})
