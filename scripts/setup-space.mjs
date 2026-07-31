#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SPACE_ID_PATTERN = /^\d+$/
const SUCCESS = 'SUCCESS'
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
  return { space, yes: argv.includes('--yes'), force: argv.includes('--force') }
}

function reportsDirFor(basePath, space) {
  return path.join(basePath, 'reports', space)
}

/**
 * The Storyblok CLI never sets a non-zero process exit code on failure — its
 * error path (`handleError` in storyblok/dist/index.mjs) logs and returns
 * without touching `process.exitCode`, and the root program has no global
 * exit handling. `result.status` from `spawnSync` is therefore never a
 * reliable signal. What IS reliable is the report the CLI writes to
 * `<path>/reports/<space>/storyblok-<command>-<runId>.json`, containing a
 * `status` field (`SUCCESS` | `PARTIAL_SUCCESS` | `FAILURE` | ...). This
 * reads the newest report matching a command+space, or null if none exists
 * or it can't be parsed.
 * @param {string} dir
 * @param {string} commandSuffix e.g. "stories-pull", "components-push"
 */
export function readLatestReport(dir, commandSuffix) {
  let files
  try {
    files = fs.readdirSync(dir)
  } catch {
    return null
  }
  const pattern = new RegExp(`^storyblok-${commandSuffix}-(\\d+)\\.json$`)
  const [latest] = files
    .map(file => ({ file, match: file.match(pattern) }))
    .filter(({ match }) => match)
    .map(({ file, match }) => ({ file, runId: Number(match[1]) }))
    .sort((a, b) => b.runId - a.runId)
  if (!latest) return null
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, latest.file), 'utf8'))
  } catch {
    return null
  }
}

/** Prints the report status plus, when available, the CLI's own per-story error list. */
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

/**
 * `stories push --publish` on a space whose Development-plan daily publish
 * quota is exhausted fails every story's publish step with the same generic
 * 422 ("well-formed ... semantic errors"), while story content itself is
 * created/updated successfully — that is the only failure signature the
 * CLI's report distinguishes from a real content problem. Content still
 * lands (as drafts); only publishing needs a retry once the quota resets, so
 * this is treated as a soft failure rather than a hard bootstrap failure.
 */
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

/**
 * Highest existing runId for a command+space, or null if none exist yet.
 * Report filenames are `storyblok-<commandSuffix>-<runId>.json` and runId is
 * a timestamp, so "highest" and "most recent" coincide.
 */
function latestRunId(dir, commandSuffix) {
  let files
  try {
    files = fs.readdirSync(dir)
  } catch {
    return null
  }
  const pattern = new RegExp(`^storyblok-${commandSuffix}-(\\d+)\\.json$`)
  const runIds = files
    .map(file => file.match(pattern))
    .filter(Boolean)
    .map(match => Number(match[1]))
  return runIds.length === 0 ? null : Math.max(...runIds)
}

/**
 * `stories push` early-returns WITHOUT writing a report when
 * `requireAuthentication` fails mid-run (e.g. an expired CLI session) or if
 * the process dies before its `finally`. Without this check, a plain
 * `readLatestReport` call after such a run would silently return a
 * PREVIOUS run's report -- very likely SUCCESS on a repeat bootstrap -- and
 * the caller would wrongly conclude success. Require the post-push report's
 * runId to be strictly newer than whatever existed before the push;
 * anything else means the push produced no new report at all.
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
  if (result.status !== 0 || !/logged in/i.test(result.stdout ?? '')) {
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

/**
 * Reuses the CLI session `requireSession` already established, rather than a
 * raw API token: `storyblok stories pull` into a throwaway directory, then
 * reads back whatever story JSON files it wrote. No network call of our own,
 * and no second auth mechanism to document.
 *
 * Success is determined from the pull's own report, never from
 * `spawnSync`'s exit code (see `readLatestReport`). A missing report, an
 * unreadable one, or a non-SUCCESS status means the check itself failed —
 * that is NOT the same as the space being empty, and must not be treated as
 * such.
 */
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

/** Slugs the baseline itself ships (home, about, data, data/redirects), derived from the committed story fixtures so this can't drift from the baseline set defined elsewhere. */
function defaultBaselineSlugs() {
  return fs
    .readdirSync(BASELINE_STORIES_DIR)
    .filter(file => file.endsWith('.json'))
    .map(
      file => JSON.parse(fs.readFileSync(path.join(BASELINE_STORIES_DIR, file), 'utf8')).full_slug
    )
}

/**
 * `stories push --from baseline --space <id>` treats this as a cross-space push
 * (the source alias "baseline" never equals the target space id). In that mode
 * the CLI's findSlugMatch accepts a slug match in the TARGET space WITHOUT
 * checking uuid equality, so a target space that already has stories at
 * home/about/data/data/redirects gets those stories silently claimed and
 * overwritten. Refuse unless the target only contains stories at baseline
 * slugs (a starter space, or a repeat run against an already-bootstrapped
 * space); anything else — a slug the baseline doesn't ship — hard-stops.
 *
 * A failed pre-check (see `defaultListStories`) is always an ERROR, never
 * "empty": `--force` can still override it, but the message makes clear the
 * check FAILED rather than passed.
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

/**
 * `components push` writes no report to gate on (see the comment above the
 * `components push` call in `main`), so success is verified positively:
 * pull the space's components back into a fresh temp dir and confirm every
 * baseline component name is present. Reuses the CLI session `requireSession`
 * already established, the same way `defaultListStories` does -- no second
 * auth mechanism to document.
 */
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
  const { space, yes, force } = parseArgs(process.argv.slice(2))
  console.log(`Target space: ${space}`)
  if (!yes) {
    console.log('This overwrites components and stories in that space. Re-run with --yes.')
    process.exit(1)
    return
  }
  requireSession()
  requireEmptySpace(space, force)

  // `components push` never writes a report -- pushCmd$3.action in
  // storyblok/dist/index.mjs never calls getReporter()/reporter.finalize()
  // (unlike stories push/pull, assets pull/push/transfer, migrations run,
  // and schema push/init/rollback, which all do). Gating on a report here
  // would always fail closed, so this pushes directly and verifies the
  // result positively instead -- see requireComponentsPushed.
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

  const storiesReport = run(
    ['stories', 'push', '--from', 'baseline', '--space', space, '--publish'],
    'stories-push',
    space
  )

  if (storiesReport?.status === SUCCESS) {
    console.log(
      '\nDone. One manual step remains: delete the Storyblok starter bloks\n' +
        '(feature, grid, teaser) in the UI — `components push` cannot delete.'
    )
    return
  }

  if (isLikelyPublishQuotaFailure(storiesReport)) {
    console.warn(
      '\nStory content pushed, but publishing failed for every story with the\n' +
        'generic error Storyblok returns when a Development-plan space has hit\n' +
        'its daily publish quota. Content landed as drafts — this is NOT treated\n' +
        'as a bootstrap failure. Publish manually once the quota resets\n' +
        `(Storyblok UI, or \`yarn storyblok stories publish --space ${space}\`).`
    )
    console.log(
      '\nOne manual step remains: delete the Storyblok starter bloks\n' +
        '(feature, grid, teaser) in the UI — `components push` cannot delete.'
    )
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
