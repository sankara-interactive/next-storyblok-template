/**
 * Renders a Storyblok story as markdown for agents (Accept negotiation in
 * `proxy.ts`, and `/llms.txt`). Deliberately generic: it walks the blok tree by
 * the field-name vocabulary in CLAUDE.md rather than mapping every component,
 * so a new blok that follows the vocabulary needs no code here.
 */
import { SITE_NAME } from './config'

type Json = unknown
type Blok = Record<string, Json>

/** Presentational, technical or asset-only fields — never prose. */
const SKIP_FIELDS = new Set([
  '_uid',
  '_editable',
  'component',
  'plugin',
  'seo',
  'anchor',
  'variant',
  'theme',
  'image',
  'images',
  'icon',
  'source',
  'destination',
  'permanent',
  'website_id',
])

/** Rendered as the blok's heading, first match wins. */
const HEADING_FIELDS = ['headline', 'title', 'question', 'name', 'label']

/** Prose fields in render order; anything left over follows alphabetically. */
const TEXT_ORDER = ['eyebrow', 'lead', 'text', 'description', 'answer', 'quote']

/** `is_*` / `has_*` are display flags by convention, never prose. */
const isFlag = (field: string) => /^(is|has)_/.test(field)

const isBlok = (v: Json): v is Blok =>
  typeof v === 'object' && v !== null && typeof (v as Blok).component === 'string'

const isRichText = (v: Json): v is Blok =>
  typeof v === 'object' && v !== null && (v as Blok).type === 'doc'

const isLink = (v: Json): v is Blok =>
  typeof v === 'object' && v !== null && (v as Blok).fieldtype === 'multilink'

function absolute(href: string, baseUrl: string): string {
  if (!href || /^[a-z]+:/i.test(href) || href.startsWith('#')) return href
  return new URL(href.startsWith('/') ? href : `/${href}`, baseUrl).toString()
}

function linkHref(link: Blok, baseUrl: string): string {
  const anchor = typeof link.anchor === 'string' && link.anchor ? `#${link.anchor}` : ''
  if (link.linktype === 'email') return `mailto:${link.email ?? ''}`
  if (link.linktype === 'asset') return String(link.url ?? '')
  if (link.linktype === 'story') {
    const story = link.story as { full_slug?: string } | undefined
    // `/`, not `/home` — the canonical URL the sitemap and page route use.
    const slug = story?.full_slug ?? link.cached_url ?? ''
    return absolute(`${slug === 'home' ? '/' : slug}${anchor}`, baseUrl)
  }
  return `${absolute(String(link.url || link.cached_url || ''), baseUrl)}${anchor}`
}

/** A multi-line textarea is a plain-line list, so it becomes a bullet list. */
function plainText(value: string): string {
  const lines = value
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
  return lines.length > 1 ? lines.map(l => `- ${l}`).join('\n') : (lines[0] ?? '')
}

function inlineMarkdown(nodes: Json, baseUrl: string): string {
  if (!Array.isArray(nodes)) return ''
  return nodes
    .map((node: Blok) => {
      if (node?.type === 'hard_break') return '\n'
      let text = typeof node?.text === 'string' ? node.text : ''
      if (!text) return ''
      const marks = Array.isArray(node.marks) ? (node.marks as Blok[]) : []
      if (marks.some(m => m.type === 'bold')) text = `**${text}**`
      if (marks.some(m => m.type === 'italic')) text = `_${text}_`
      const link = marks.find(m => m.type === 'link')
      if (link) {
        const attrs = (link.attrs ?? {}) as Blok
        const href =
          attrs.linktype === 'email'
            ? `mailto:${attrs.href}`
            : absolute(String(attrs.href ?? ''), baseUrl)
        if (href) text = `[${text}](${href})`
      }
      return text
    })
    .join('')
}

function richTextToMarkdown(doc: Blok, depth: number, baseUrl: string): string[] {
  const out: string[] = []
  const walk = (nodes: Json) => {
    if (!Array.isArray(nodes)) return
    for (const node of nodes as Blok[]) {
      switch (node?.type) {
        case 'heading': {
          const level = Math.min(6, Math.max(depth, Number((node.attrs as Blok)?.level) || depth))
          const text = inlineMarkdown(node.content, baseUrl)
          if (text) out.push(`${'#'.repeat(level)} ${text}`)
          break
        }
        case 'paragraph': {
          const text = inlineMarkdown(node.content, baseUrl)
          if (text.trim()) out.push(text)
          break
        }
        case 'bullet_list':
        case 'ordered_list': {
          const items = (Array.isArray(node.content) ? (node.content as Blok[]) : []).map(
            (item, i) => {
              const nested = Array.isArray(item.content) ? (item.content as Blok[]) : []
              const inner = nested.map(child => inlineMarkdown(child.content, baseUrl))
              return `${node.type === 'ordered_list' ? `${i + 1}.` : '-'} ${inner.filter(Boolean).join(' ')}`
            }
          )
          if (items.length) out.push(items.join('\n'))
          break
        }
        case 'horizontal_rule':
          out.push('---')
          break
        default:
          walk(node?.content)
      }
    }
  }
  walk(doc.content)
  return out
}

function blokToMarkdown(blok: Blok, depth: number, baseUrl: string): string[] {
  if (blok.is_hidden === true) return []
  const level = Math.min(6, depth)
  const headings: string[] = []
  const texts: string[] = []
  const links: string[] = []
  const children: string[] = []
  const used = new Set<string>(SKIP_FIELDS)

  // One heading per blok. A second heading-ish field reads as a kicker, so it
  // becomes prose rather than a competing heading.
  for (const field of HEADING_FIELDS) {
    used.add(field)
    const value = blok[field]
    if (typeof value !== 'string' || !value.trim()) continue
    if (headings.length) texts.push(value.trim())
    else headings.push(`${'#'.repeat(level)} ${value.trim()}`)
  }

  const scalars = Object.keys(blok).filter(
    k => !used.has(k) && !isFlag(k) && !Array.isArray(blok[k]) && !isLink(blok[k])
  )
  const ordered = [
    ...TEXT_ORDER.filter(f => scalars.includes(f)),
    ...scalars.filter(f => !TEXT_ORDER.includes(f)).sort(),
  ]
  for (const field of ordered) {
    used.add(field)
    const value = blok[field]
    if (isRichText(value)) texts.push(...richTextToMarkdown(value, level + 1, baseUrl))
    else if (typeof value === 'string' && value.trim()) texts.push(plainText(value))
  }

  for (const [field, value] of Object.entries(blok)) {
    if (used.has(field) || !isLink(value)) continue
    const href = linkHref(value, baseUrl)
    if (!href) continue
    const label = [blok[`${field}_label`], blok.label].find(
      v => typeof v === 'string' && v.trim()
    ) as string | undefined
    links.push(`- [${(label ?? href).trim()}](${href})`)
  }

  for (const value of Object.values(blok)) {
    if (!Array.isArray(value)) continue
    for (const child of value) {
      if (isBlok(child)) children.push(...blokToMarkdown(child, depth + 1, baseUrl))
    }
  }

  // A link-only blok (a button) is a link, not a section: drop its label heading.
  if (links.length && headings.length === 1 && !texts.length && !children.length) return links
  return [...headings, ...texts, ...(links.length ? [links.join('\n')] : []), ...children]
}

// `object`, not `Blok`: generated story interfaces have no index signature, so
// they don't satisfy Record<string, unknown> at the call site.
export type MarkdownStory = { name?: string; content?: object }

/** Markdown for one story: H1 from the SEO title, then the body bloks. */
export function storyToMarkdown(story: MarkdownStory, baseUrl: string): string {
  const content = (story.content ?? {}) as Blok
  const seo = (content.seo ?? {}) as Blok
  const title = (typeof seo.title === 'string' && seo.title.trim()) || story.name || SITE_NAME
  const blocks: string[] = [`# ${title.trim()}`]
  if (typeof seo.description === 'string' && seo.description.trim()) {
    blocks.push(seo.description.trim())
  }
  const body = Array.isArray(content.body) ? content.body : []
  for (const blok of body) if (isBlok(blok)) blocks.push(...blokToMarkdown(blok, 2, baseUrl))
  return `${blocks.filter(b => b.trim()).join('\n\n')}\n`
}
