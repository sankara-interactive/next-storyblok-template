#!/usr/bin/env node

import { ISbSchema, SbBlokKeyDataTypes } from "@storyblok/react"

const fs = require('fs')
const path = require('path')

const repoRoot = path.resolve(__dirname, '..')

// Resolve the components.json: use an explicit arg, otherwise auto-detect the
// single pulled component set under .storyblok/components/<space>/components.json
// (so `yarn scaffold` works without needing $STORYBLOK_SPACE_ID in the shell).
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
    console.error(
      'No .storyblok/components/<space>/components.json found. Run `yarn sync` first.'
    )
    process.exit(1)
  }
  if (matches.length > 1) {
    console.warn(`Multiple component sets found using ${matches[0]}`)
  }
  return matches[0]
}

const schema = JSON.parse(fs.readFileSync(resolveSchemaPath(), 'utf8'))

const generateContent = (schema) => {
  let result = Object.entries(schema.schema).map(([key, value]) => ({
    name: key,
    type: value.type,
    required: !!value.required,
    filetypes: value.filetypes,
  }))
  return result.map(blok => {
    switch (blok.type) {
      case 'text':
        if (blok.required) {
          return `{blok.` + blok.name + ` && <p>{blok.` + blok.name + `}</p>}`
        }
        return `<p>{blok.` + blok.name + `}</p>`
      case 'richtext':
        return `
        <div className="richtext">
          <RichTextRenderer text={blok.` + blok.name + `} />
        </div>`
      case 'asset':
        if (blok.filetypes?.includes('images')) {
          return `
          {blok.` + blok.name + `${blok.required ? '' : '?'}.filename &&
            <div className="relative aspect-square">
              <Image src={blok.` + blok.name + `.filename} alt={blok.` + blok.name + `.alt} />}
            </div>
          }`
        } else if (blok.filetypes?.includes('videos')) {
          return `
          {blok.` + blok.name + `${blok.required ? '' : '?'}.filename &&
            <video controls>
              <source src={blok.` + blok.name + `.filename} type="video/mp4" />
            </video>
          }`
        }
      case 'link':
        return `<SbLink link={blok.` + blok.name + `}></SbLink>`
      case 'bloks':
        return `
        {blok.`+blok.name+` && blok.` + blok.name + `.map(nestedBlok => <StoryblokServerComponent blok={nestedBlok} key={nestedBlok._uid} />)}`
      default:
        if (blok.required) {
          return `{blok.` + blok.name + ` && <div>{blok.` + blok.name + `}</div>}`
        }
        return `<div>{blok.` + blok.name + `}</div>`
    }
  })

}
schema.forEach((componentSchema) => {
  let componentName = componentSchema.name
  componentName = componentName.charAt(0).toUpperCase() + componentName.slice(1)

  let className = componentName+'Props'

  let filePath = componentSchema.is_nestable
    ? `./components/nestables/${componentName}.tsx`
    : `./components/content_types/${componentName}.tsx`

  let directory = path.dirname(filePath)
  if (!fs.existsSync(directory)){
    fs.mkdirSync(directory)
  }

  if(fs.existsSync(filePath)) {
    console.log(`⏭️ File ${componentName}.tsx already exists at ${filePath}. Skipping.`)
    return
  }

  const component = `
    import { StoryblokServerComponent, storyblokEditable } from '@storyblok/react/rsc'
    import { ${componentName}Storyblok } from '@storyblok-component-types'
    ${Object.values(componentSchema.schema).find(schema => schema.type === 'richtext') ? `import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'` : ''}
    ${Object.values(componentSchema.schema).find(schema => schema.type === 'image') ? `import Image from 'next/image'` : ''}
    
    export default function ${componentName}({ blok }: { blok: ${componentName}Storyblok }) {
      return (
        <section {...storyblokEditable(blok)}>
          <div>
            ` + generateContent(componentSchema).join('\n') +`
          </div>
        </section>
      )
    }`
  fs.writeFileSync(path.resolve('./', filePath), component)
  console.log(`✅ File ${componentName}.tsx created at ${filePath}`)
})

