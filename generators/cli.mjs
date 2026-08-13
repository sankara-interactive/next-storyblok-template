#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')

// hero_section -> HeroSection, matching Storyblok's `<Name>Storyblok` type names.
const toPascalCase = name =>
  name
    .split(/[_-]/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

// Explicit arg, else the single pulled set under .storyblok/components/<space>/,
// so `yarn scaffold` needs no $STORYBLOK_SPACE_ID.
function resolveSchemaPath() {
  const arg = process.argv[2]
  if (arg) return path.resolve(repoRoot, arg)

  const base = path.join(repoRoot, '.storyblok', 'components')
  const matches = fs.existsSync(base)
    ? fs
        .readdirSync(base)
        .map(dir => path.join(base, dir, 'components.json'))
        .filter(p => fs.existsSync(p))
    : []

  if (matches.length === 0) {
    console.error('No .storyblok/components/<space>/components.json found. Run `yarn sync` first.')
    process.exit(1)
  }
  if (matches.length > 1) {
    console.warn(`Multiple component sets found using ${matches[0]}`)
  }
  return matches[0]
}

const schema = JSON.parse(fs.readFileSync(resolveSchemaPath(), 'utf8'))

// Unrestricted assets render as images; only explicit `videos` gets <video>.
// Shared so the markup and the <Image> import can't disagree.
const isImageAsset = field => field.type === 'asset' && !field.filetypes?.includes('videos')

// `headline` is the field-name vocabulary's word for a heading (see CLAUDE.md),
// so a text field called that gets the component rather than a <p>. level={2} is
// the common case — a section heading under the page's h1 — and wrong often
// enough that it is meant to be edited, like every other line of a stub.
const isHeadline = field =>
  field.name === 'headline' && (field.type === 'text' || field.type === 'textarea')

const generateContent = componentSchema => {
  const fields = Object.entries(componentSchema.schema).map(([key, value]) => ({
    name: key,
    type: value.type,
    required: !!value.required,
    filetypes: value.filetypes,
  }))
  return fields
    .map(field => {
      const f = `blok.${field.name}`
      switch (field.type) {
        case 'text':
        case 'textarea': {
          const element = isHeadline(field)
            ? `<Heading level={2}>{${f}}</Heading>`
            : `<p>{${f}}</p>`
          return field.required ? element : `{${f} && ${element}}`
        }
        case 'richtext':
          // wrapper={false}: the SDK renderer's own <div> breaks RichText's flow
          // spacing, which only reaches direct children.
          return `{${f} && (
            <RichText>
              <RichTextRenderer text={${f}} wrapper={false} />
            </RichText>
          )}`
        case 'asset':
          if (!isImageAsset(field)) {
            return `{${f}?.filename && (
            <video controls>
              <source src={${f}.filename} type="video/mp4" />
            </video>
          )}`
          }
          return `{${f}?.filename && (
            <div className="relative aspect-square">
              <Image src={${f}.filename} alt={${f}.alt ?? ''} fill className="object-cover" />
            </div>
          )}`
        case 'multilink':
        case 'link':
          return `{${f} && <SbLink link={${f}}>{/* label */}</SbLink>}`
        case 'bloks':
          return `{${f}?.map(nestedBlok => (
            <StoryblokServerComponent blok={nestedBlok} key={nestedBlok._uid} />
          ))}`
        case 'tab':
        case 'section':
        case 'custom':
          return null // UI grouping / plugin fields — nothing to render
        default:
          return field.required ? `<div>{${f}}</div>` : `{${f} && <div>{${f}}</div>}`
      }
    })
    .filter(Boolean)
}
schema.forEach(componentSchema => {
  const componentName = toPascalCase(componentSchema.name)
  const fields = Object.entries(componentSchema.schema).map(([name, value]) => ({ name, ...value }))
  const fieldTypes = new Set(fields.map(f => f.type))
  const hasImage = fields.some(isImageAsset)
  const packageImports = [
    fields.some(isHeadline) && 'Heading',
    fieldTypes.has('richtext') && 'RichText',
  ].filter(Boolean)

  const filePath = path.join(
    repoRoot,
    componentSchema.is_nestable
      ? `components/nestables/${componentName}.tsx`
      : `components/content_types/${componentName}.tsx`
  )
  fs.mkdirSync(path.dirname(filePath), { recursive: true })

  if (fs.existsSync(filePath)) {
    console.log(`⏭️ File ${componentName}.tsx already exists at ${filePath}. Skipping.`)
    return
  }

  const imports = [
    `import { SbBlokData, ${fieldTypes.has('bloks') ? 'StoryblokServerComponent, ' : ''}storyblokEditable } from '@storyblok/react/rsc'`,
    `import { ${componentName}Storyblok } from '@storyblok-component-types'`,
    packageImports.length > 0 && `import { ${packageImports.join(', ')} } from '@sankara-ui/core'`,
    hasImage && `import Image from 'next/image'`,
    fieldTypes.has('richtext') &&
      `import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'`,
    (fieldTypes.has('multilink') || fieldTypes.has('link')) &&
      `import { SbLink } from '@/components/helpers/SbLink'`,
  ].filter(Boolean)

  const component = `${imports.join('\n')}

export default function ${componentName}({ blok }: { blok: ${componentName}Storyblok }) {
  return (
    <section {...storyblokEditable(blok as unknown as SbBlokData)}>
      <div>
        ${generateContent(componentSchema).join('\n        ')}
      </div>
    </section>
  )
}
`
  fs.writeFileSync(filePath, component)
  console.log(`✅ File ${componentName}.tsx created at ${filePath}`)
})
