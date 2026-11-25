#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SPACE_ID_PATTERN = /^\d+$/
const SUCCESS = 'SUCCESS'
const MANUAL_STEP_REMINDER =
  'One manual step remains: delete the Storyblok starter bloks\n' +
  '(feature, grid, teaser) in the UI — `components push` cannot delete.'
const STORYBLOK_ROOT = path.join(process.cwd(), '.storyblok')
const BASELINE_STORIES_DIR = path.join(STORYBLOK_ROOT, 'stories/baseline')
const BASELINE_COMPONENTS_FILE = path.join(
  STORYBLOK_ROOT,
  'components/baseline/components.baseline.json'
)

/** Never falls back to STORYBLOK_SPACE_ID: that points at a live space. */
export function parseArgs(argv) {
  const spaceIndex = argv.indexOf('--space')
  const space = spaceIndex === -1 ? undefined : argv[spaceIndex + 1]
  if (!space) {
    throw new Error('Pass the target space explicitly: yarn setup:space --space <id> --yes')
  }
  if (!SPACE_ID_PATTERN.test(space)) {
    throw new Error(`Space id must be numeric, got "${space}"`)
  }
  return {
    space,
    yes: argv.includes('--yes'),
    force: argv.includes('--force'),
    publish: argv.includes('--publish'),
  }
}

function reportsDirFor(basePath, space) {
  return path.join(basePath, 'reports', space)
}

/**
 * The Storyblok CLI never sets a non-zero exit code, so success is read from the
 * `status` of the report it writes. Returns the newest matching report, or null.
 * @param {string} dir
 * @param {string} commandSuffix e.g. "stories-pull", "components-push"
 */
export function readLatestReport(dir, commandSuffix) {
  const [latest] = matchingReports(dir, commandSuffix)
  if (!latest) return null
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, latest.file), 'utf8'))
  } catch {
    return null
  }
}

function matchingReports(dir, commandSuffix) {
  let files
  try {
    files = fs.readdirSync(dir)
  } catch {
    return []
  }
  const pattern = new RegExp(`^storyblok-${commandSuffix}-(\\d+)\\.json$`)
  return files
    .map(file => file.match(pattern))
    .filter(Boolean)
    .map(match => ({ file: match[0], runId: Number(match[1]) }))
    .sort((a, b) => b.runId - a.runId)
}

function describeReportFailure(report) {
  if (!report) return 'no report was written'
  const failedStories = report.meta?.failedStories
  if (Array.isArray(failedStories) && failedStories.length > 0) {
    return (
      `status: ${report.status}\n` +
      failedStories.map(story => `  - ${story.full_slug ?? story.slug}: ${story.error}`).join('\n')
    )
  }
  return `status: ${report.status}`
}

const PUBLISH_QUOTA_ERROR_PATTERN =
  /well-formed but was unable to be followed due to semantic errors/i

// Past the daily publish quota a Development-plan space answers a generic 422 and
// does not update the story at all; re-running without `--publish` fixes it.
export function isLikelyPublishQuotaFailure(report) {
  if (!report || report.status !== 'PARTIAL_SUCCESS') return false
  const summary = report.summary ?? {}
  if ((summary.creationResults?.failed ?? 0) > 0) return false
  if ((summary.processResults?.failed ?? 0) > 0) return false
  if ((summary.updateResults?.failed ?? 0) === 0) return false
  const failedStories = report.meta?.failedStories ?? []
  return (
    failedStories.length > 0 &&
    failedStories.every(story => PUBLISH_QUOTA_ERROR_PATTERN.test(story.error ?? ''))
  )
}

function latestRunId(dir, commandSuffix) {
  const [latest] = matchingReports(dir, commandSuffix)
  return latest ? latest.runId : null
}

/**
 * A missing report must not be mistaken for a previous run's success.
 * @param {string} dir
 * @param {string} commandSuffix
 * @param {number | null} beforeRunId
 */
export function requireFreshReport(dir, commandSuffix, beforeRunId) {
  const afterRunId = latestRunId(dir, commandSuffix)
  if (afterRunId === null || (beforeRunId !== null && afterRunId <= beforeRunId)) {
    throw new Error(
      `\`storyblok ${commandSuffix.replace(/-/g, ' ')}\` produced no new report ` +
        `(most recent report is still ${beforeRunId === null ? 'none' : `runId ${beforeRunId}`}).`
    )
  }
  return readLatestReport(dir, commandSuffix)
}

function spawnStoryblok(args) {
  spawnSync('yarn', ['storyblok', ...args], { stdio: 'inherit', encoding: 'utf8' })
}

function run(args, commandSuffix, space) {
  const dir = reportsDirFor(STORYBLOK_ROOT, space)
  const beforeRunId = latestRunId(dir, commandSuffix)
  spawnStoryblok(args)
  return requireFreshReport(dir, commandSuffix, beforeRunId)
}

function defaultCheckSession() {
  return spawnSync('yarn', ['storyblok', 'user'], { encoding: 'utf8' })
}

/**
 * A personal access token 403s on /internal_tags, which components push calls.
 * @param {{ checkSession?: () => { status: number | null, stdout?: string, stderr?: string } }} [options]
 */
export function requireSession({ checkSession = defaultCheckSession } = {}) {
  const result = checkSession()
  if (result.status !== 0 || !/logged in/i.test(`${result.stdout ?? ''}${result.stderr ?? ''}`)) {
    console.error(
      'No Storyblok CLI session.\n' +
        'Run `storyblok login -r eu` and choose "With email".\n' +
        'A personal access token will not work: it is rejected by /internal_tags,\n' +
        'which `components push` calls unconditionally.'
    )
    process.exit(1)
    return
  }
}

// A missing or unsuccessful report means the safety check failed, not that the
// space is empty.
function defaultListStories(space) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-space-check-'))
  try {
    spawnSync('yarn', ['storyblok', '--path', tmpDir, 'stories', 'pull', '--space', space], {
      encoding: 'utf8',
    })
    const report = readLatestReport(reportsDirFor(tmpDir, space), 'stories-pull')
    if (report?.status !== SUCCESS) {
      throw new Error(
        `\`storyblok stories pull\` did not report success for space ${space} ` +
          `(${report ? `status: ${report.status}` : 'no report was written'}).`
      )
    }
    const storiesDir = path.join(tmpDir, 'stories', space)
    if (!fs.existsSync(storiesDir)) return []
    return fs
      .readdirSync(storiesDir)
      .filter(file => file.endsWith('.json'))
      .map(file => JSON.parse(fs.readFileSync(path.join(storiesDir, file), 'utf8')))
      .map(story => ({ full_slug: story.full_slug, id: story.id }))
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

function defaultBaselineSlugs() {
  return fs
    .readdirSync(BASELINE_STORIES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(
      file => JSON.parse(fs.readFileSync(path.join(BASELINE_STORIES_DIR, file), 'utf8')).full_slug
    )
}

/**
 * Refuse a space holding stories outside the baseline. `--force` overrides the
 * refusal, but a failed pre-check is still an error, never an empty space.
 * @param {string} space
 * @param {boolean} force
 * @param {{ listStories?: (space: string) => Array<{ full_slug: string, id: number }>, baselineSlugs?: () => string[] }} [options]
 */
export function requireEmptySpace(
  space,
  force,
  { listStories = defaultListStories, baselineSlugs = defaultBaselineSlugs } = {}
) {
  let stories
  try {
    stories = listStories(space)
  } catch (error) {
    console.error(
      `Could not confirm space ${space} is safe to push into:\n  ${error.message}\n\n` +
        'The pre-push check FAILED — that is not the same as the space being\n' +
        'empty, and proceeding could silently overwrite existing content.'
    )
    if (!force) {
      console.error('Re-run with --force only once you have confirmed manually that this is safe.')
      process.exit(1)
      return
    }
    console.error('Continuing anyway because --force was passed, despite the check failing.')
    return
  }

  const baseline = new Set(baselineSlugs())
  const unexpected = stories.filter(story => !baseline.has(story.full_slug))
  if (unexpected.length === 0) return

  console.error(
    `Space ${space} already contains ${unexpected.length} stor${unexpected.length === 1 ? 'y' : 'ies'} outside the baseline set:\n` +
      unexpected.map(story => `  - ${story.full_slug} (id ${story.id})`).join('\n') +
      '\n\nPushing the baseline into a space with unrelated content can silently\n' +
      'claim and overwrite stories at matching slugs. Target an empty (or\n' +
      'baseline-only) space, or re-run with --force if you knowingly want to\n' +
      'push into this space again.'
  )
  if (!force) {
    process.exit(1)
    return
  }
  console.error('Continuing anyway because --force was passed.')
}

// `components push` writes no report, so success is verified by pulling the
// components back and checking every baseline name is present.
function defaultPulledComponentNames(space) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-space-components-check-'))
  try {
    spawnSync('yarn', ['storyblok', '--path', tmpDir, 'components', 'pull', '--space', space], {
      encoding: 'utf8',
    })
    const componentsFile = path.join(tmpDir, 'components', space, 'components.json')
    if (!fs.existsSync(componentsFile)) return []
    return JSON.parse(fs.readFileSync(componentsFile, 'utf8')).map(component => component.name)
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true })
  }
}

function defaultBaselineComponentNames() {
  return JSON.parse(fs.readFileSync(BASELINE_COMPONENTS_FILE, 'utf8')).map(
    component => component.name
  )
}

/**
 * @param {string} space
 * @param {{ pulledComponentNames?: (space: string) => string[], baselineComponentNames?: () => string[] }} [options]
 */
export function requireComponentsPushed(
  space,
  {
    pulledComponentNames = defaultPulledComponentNames,
    baselineComponentNames = defaultBaselineComponentNames,
  } = {}
) {
  const pulled = new Set(pulledComponentNames(space))
  const missing = baselineComponentNames().filter(name => !pulled.has(name))
  if (missing.length === 0) return
  console.error(
    `Components push did not land in space ${space}: missing from the space after push:\n` +
      missing.map(name => `  - ${name}`).join('\n')
  )
  process.exit(1)
}

function main() {
  const { space, yes, force, publish } = parseArgs(process.argv.slice(2))
  console.log(`Target space: ${space}`)
  if (!yes) {
    console.log('This overwrites components and stories in that space. Re-run with --yes.')
    process.exit(1)
    return
  }
  requireSession()
  requireEmptySpace(space, force)

  // No report to gate on here: see requireComponentsPushed.
  spawnStoryblok([
    'components',
    'push',
    '--from',
    'baseline',
    '--suffix',
    'baseline',
    '--space',
    space,
  ])
  requireComponentsPushed(space)

  // Drafts by default: a Development-plan space publishes three stories a day
  // and the baseline holds four, and `next dev` and preview hosts read drafts.
  const storiesReport = run(
    ['stories', 'push', '--from', 'baseline', '--space', space, ...(publish ? ['--publish'] : [])],
    'stories-push',
    space
  )

  if (storiesReport?.status === SUCCESS) {
    console.log(`\nDone. ${MANUAL_STEP_REMINDER}`)
    return
  }

  if (isLikelyPublishQuotaFailure(storiesReport)) {
    console.warn(
      '\nSome stories failed with the generic error Storyblok returns when a\n' +
        'Development-plan space has hit its daily publish quota. Those stories\n' +
        'were NOT updated — the push and the publish are one request. Re-run\n' +
        `without --publish to land them as drafts: yarn setup:space --space ${space} --yes --force`
    )
    console.log(`\n${MANUAL_STEP_REMINDER}`)
    return
  }

  console.error(`stories push did not succeed (${describeReportFailure(storiesReport)}).`)
  process.exit(1)
}

if (import.meta.filename === process.argv[1]) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
