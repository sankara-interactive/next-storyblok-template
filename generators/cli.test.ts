import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, expect, test } from 'vitest'

// Smoke test: the scaffold CLI must emit a stub that wires every field type
// correctly. Full compile-safety was verified once by hand (tsc --noEmit);
// this guards the template against silent regressions.

const repoRoot = process.cwd()
const outFile = path.join(repoRoot, 'components/nestables/ScaffoldSmokeSection.tsx')

afterAll(() => fs.rmSync(outFile, { force: true }))

test('scaffold CLI generates a stub covering all field types', () => {
  const schema = [
    {
      name: 'scaffold_smoke_section',
      is_nestable: true,
      schema: {
        eyebrow: { type: 'text' },
        headline: { type: 'text', required: true },
        text: { type: 'richtext' },
        image: { type: 'asset', filetypes: ['images'] },
        video: { type: 'asset', filetypes: ['videos'] },
        link: { type: 'multilink' },
        items: { type: 'bloks' },
        'tab-x': { type: 'tab' },
        seo: { type: 'custom' },
      },
    },
  ]
  const tmp = path.join(os.tmpdir(), `scaffold-smoke-${process.pid}.json`)
  fs.writeFileSync(tmp, JSON.stringify(schema))
  fs.rmSync(outFile, { force: true })
  try {
    execFileSync('node', ['generators/cli.mjs', tmp], { cwd: repoRoot })
    const src = fs.readFileSync(outFile, 'utf8')
    // required field renders bare, optional field is guarded
    expect(src).toContain('<Heading level={2}>{blok.headline}</Heading>')
    expect(src).toContain('{blok.eyebrow && <p>{blok.eyebrow}</p>}')
    // imports appear only when the matching field type exists
    expect(src).toContain("import { Heading, RichText } from '@sankara-ui/core'")
    expect(src).toContain("import Image from 'next/image'")
    expect(src).toContain('StoryblokServerComponent')
    expect(src).toContain('<SbLink link={blok.link}>')
    // the package's container, and no SDK wrapper div inside it
    expect(src).toContain('<RichText>')
    expect(src).toContain('<RichTextRenderer text={blok.text} wrapper={false} />')
    expect(src).not.toContain('className="richtext"')
    expect(src).toContain('storyblokEditable(blok as unknown as SbBlokData)')
    // UI/plugin fields are skipped entirely
    expect(src).not.toContain('tab-x')
    expect(src).not.toContain('blok.seo')
  } finally {
    fs.rmSync(tmp, { force: true })
  }
})
