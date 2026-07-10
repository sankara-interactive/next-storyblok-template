import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const root = process.cwd()
const storyblokRoot = path.join(root, '.storyblok')
const sourceComponents = path.join(storyblokRoot, 'components')
const committedTypes = path.join(storyblokRoot, 'types')
const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'storyblok-types-'))
const spaceIds = fs
  .readdirSync(sourceComponents, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .filter(entry => fs.existsSync(path.join(sourceComponents, entry.name, 'components.json')))
  .map(entry => entry.name)

if (spaceIds.length !== 1) {
  throw new Error(`Expected one committed Storyblok component set, found ${spaceIds.length}`)
}

const filesBelow = directory =>
  fs
    .readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => path.join(entry.parentPath, entry.name))
    .map(file => path.relative(directory, file))
    .sort()

try {
  fs.cpSync(sourceComponents, path.join(temporaryRoot, 'components'), { recursive: true })

  const result = spawnSync(
    'yarn',
    [
      'storyblok',
      'types',
      'generate',
      '--path',
      temporaryRoot,
      '--space',
      spaceIds[0],
      '--strict',
      '--type-suffix',
      'Storyblok',
      '--custom-fields-parser',
      './lib/customFieldTypesParser.mjs',
    ],
    { cwd: root, encoding: 'utf8' }
  )

  if (result.status !== 0) {
    process.stderr.write(result.stdout)
    process.stderr.write(result.stderr)
    process.exit(result.status ?? 1)
  }

  const generatedTypes = path.join(temporaryRoot, 'types')
  const committedFiles = filesBelow(committedTypes)
  const generatedFiles = filesBelow(generatedTypes)

  if (JSON.stringify(committedFiles) !== JSON.stringify(generatedFiles)) {
    throw new Error('Generated Storyblok type file set differs from committed files')
  }

  const changed = committedFiles.filter(
    file =>
      !fs
        .readFileSync(path.join(committedTypes, file))
        .equals(fs.readFileSync(path.join(generatedTypes, file)))
  )

  if (changed.length > 0) {
    throw new Error(`Generated Storyblok types are stale: ${changed.join(', ')}`)
  }

  console.log('Committed Storyblok types match the component schemas.')
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true })
}
