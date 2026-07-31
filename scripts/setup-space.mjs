#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SPACE_ID_PATTERN = /^\d+$/

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

function run(args) {
  const result = spawnSync('yarn', ['storyblok', ...args], { stdio: 'inherit', encoding: 'utf8' })
  if (result.status !== 0) process.exit(result.status ?? 1)
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
 */
function defaultListStories(space) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-space-check-'))
  try {
    const result = spawnSync(
      'yarn',
      ['storyblok', '--path', tmpDir, 'stories', 'pull', '--space', space],
      { encoding: 'utf8' }
    )
    if (result.status !== 0) {
      throw new Error(
        `Could not check whether space ${space} is empty: ` +
          `\`storyblok stories pull\` exited ${result.status}.\n${result.stderr ?? ''}`
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

/**
 * `stories push --from baseline --space <id>` treats this as a cross-space push
 * (the source alias "baseline" never equals the target space id). In that mode
 * the CLI's findSlugMatch accepts a slug match in the TARGET space WITHOUT
 * checking uuid equality, so a target space that already has stories at
 * home/about/data/data/redirects gets those stories silently claimed and
 * overwritten. Refuse unless the target space is empty, or the operator passes
 * --force to acknowledge a deliberate re-run.
 * @param {string} space
 * @param {boolean} force
 * @param {{ listStories?: (space: string) => Array<{ full_slug: string, id: number }> }} [options]
 */
export function requireEmptySpace(space, force, { listStories = defaultListStories } = {}) {
  const stories = listStories(space)
  if (stories.length > 0) {
    console.error(
      `Space ${space} already contains ${stories.length} stor${stories.length === 1 ? 'y' : 'ies'}:\n` +
        stories.map(story => `  - ${story.full_slug} (id ${story.id})`).join('\n') +
        '\n\nPushing the baseline into a non-empty space can silently claim and\n' +
        'overwrite existing stories at matching slugs (home, about, data,\n' +
        'data/redirects). Target an empty space, or re-run with --force if you\n' +
        'knowingly want to push into this space again.'
    )
    if (!force) {
      process.exit(1)
      return
    }
    console.error('Continuing anyway because --force was passed.')
  }
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
  run(['components', 'push', '--from', 'baseline', '--suffix', 'baseline', '--space', space])
  run(['stories', 'push', '--from', 'baseline', '--space', space, '--publish'])
  console.log(
    '\nDone. One manual step remains: delete the Storyblok starter bloks\n' +
      '(feature, grid, teaser) in the UI — `components push` cannot delete.'
  )
}

if (import.meta.filename === process.argv[1]) {
  try {
    main()
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
