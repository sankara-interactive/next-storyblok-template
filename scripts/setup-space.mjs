#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

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

/** A personal access token 403s on /internal_tags, which components push calls. */
function requireSession() {
  const result = spawnSync('yarn', ['storyblok', 'user'], { encoding: 'utf8' })
  if (result.status !== 0 || !/logged in/i.test(result.stdout ?? '')) {
    console.error(
      'No Storyblok CLI session.\n' +
        'Run `storyblok login -r eu` and choose "With email".\n' +
        'A personal access token will not work: it is rejected by /internal_tags,\n' +
        'which `components push` calls unconditionally.'
    )
    process.exit(1)
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
 */
async function requireEmptySpace(space, force) {
  const token = process.env.STORYBLOK_TOKEN
  if (!token) {
    console.error(
      'STORYBLOK_TOKEN is not set.\n' +
        'This script needs it to check the target space is empty before pushing\n' +
        '(a plain node script does not auto-load .env — export it or set it in .env\n' +
        'and load it yourself). Set STORYBLOK_TOKEN in .env for this pre-flight check.'
    )
    if (!force) process.exit(1)
    console.error('Continuing anyway because --force was passed.')
    return
  }

  const response = await fetch(`https://mapi.storyblok.com/v1/spaces/${space}/stories`, {
    headers: { Authorization: token },
  })

  if (!response.ok) {
    console.error(
      `Could not verify the target space is empty: GET /spaces/${space}/stories returned ${response.status}.`
    )
    if (!force) process.exit(1)
    console.error('Continuing anyway because --force was passed.')
    return
  }

  const body = await response.json()
  const stories = body.stories ?? []

  if (stories.length > 0) {
    console.error(
      `Space ${space} already contains ${stories.length} stor${stories.length === 1 ? 'y' : 'ies'}:\n` +
        stories.map(story => `  - ${story.full_slug} (id ${story.id})`).join('\n') +
        '\n\nPushing the baseline into a non-empty space can silently claim and\n' +
        'overwrite existing stories at matching slugs (home, about, data,\n' +
        'data/redirects). Target an empty space, or re-run with --force if you\n' +
        'knowingly want to push into this space again.'
    )
    if (!force) process.exit(1)
    console.error('Continuing anyway because --force was passed.')
  }
}

async function main() {
  const { space, yes, force } = parseArgs(process.argv.slice(2))
  console.log(`Target space: ${space}`)
  if (!yes) {
    console.log('This overwrites components and stories in that space. Re-run with --yes.')
    process.exit(1)
  }
  requireSession()
  await requireEmptySpace(space, force)
  run(['components', 'push', '--from', 'baseline', '--suffix', 'baseline', '--space', space])
  run(['stories', 'push', '--from', 'baseline', '--space', space, '--publish'])
  console.log(
    '\nDone. One manual step remains: delete the Storyblok starter bloks\n' +
      '(feature, grid, teaser) in the UI — `components push` cannot delete.'
  )
}

if (import.meta.filename === process.argv[1]) main()
