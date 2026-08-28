import { describe, expect, it } from 'vitest'
import { storyToMarkdown } from './story-markdown'

const BASE = 'https://example.test'

const doc = (...content: unknown[]) => ({ type: 'doc', content })
const para = (text: string, marks?: unknown[]) => ({
  type: 'paragraph',
  content: [{ type: 'text', text, ...(marks ? { marks } : {}) }],
})

const story = (body: unknown[], seo?: Record<string, string>) => ({
  name: 'Fallback name',
  content: { component: 'page', body, ...(seo ? { seo } : {}) },
})

describe('storyToMarkdown', () => {
  it('titles from seo.title, falling back to the story name', () => {
    expect(storyToMarkdown(story([], { title: 'SEO title' }), BASE)).toMatch(/^# SEO title\n/)
    expect(storyToMarkdown(story([]), BASE)).toMatch(/^# Fallback name\n/)
  })

  it('renders headline as a heading and lead richtext as prose', () => {
    const md = storyToMarkdown(
      story([
        { component: 'text_section', headline: 'Our work', lead: doc(para('We build things.')) },
      ]),
      BASE
    )
    expect(md).toContain('## Our work')
    expect(md).toContain('We build things.')
  })

  it('demotes a second heading-ish field to prose instead of competing', () => {
    const md = storyToMarkdown(
      story([{ component: 'teaser', headline: 'Main', title: 'Second' }]),
      BASE
    )
    expect(md).toContain('## Main')
    expect(md).not.toContain('## Second')
    expect(md).toContain('Second')
  })

  it('nests child bloks one heading level deeper', () => {
    const md = storyToMarkdown(
      story([
        {
          component: 'faq_section',
          headline: 'FAQ',
          items: [{ component: 'faq_item', question: 'Why?', answer: doc(para('Because.')) }],
        },
      ]),
      BASE
    )
    expect(md).toContain('## FAQ')
    expect(md).toContain('### Why?')
    expect(md).toContain('Because.')
  })

  it('skips presentational fields and is_/has_ flags', () => {
    const md = storyToMarkdown(
      story([
        {
          component: 'teaser',
          headline: 'Visible',
          variant: 'primary',
          theme: 'dark',
          anchor: 'top',
          is_reversed: true,
          has_border: false,
        },
      ]),
      BASE
    )
    expect(md).not.toMatch(/primary|dark|top|reversed|border/)
  })

  it('drops a blok flagged is_hidden', () => {
    const md = storyToMarkdown(
      story([{ component: 'teaser', headline: 'Gone', is_hidden: true }]),
      BASE
    )
    expect(md).not.toContain('Gone')
  })

  it('absolutises story links and labels them', () => {
    const md = storyToMarkdown(
      story([
        {
          component: 'teaser',
          headline: 'Read on',
          lead: doc(para('Some prose.')),
          link: { fieldtype: 'multilink', linktype: 'story', cached_url: 'about' },
          link_label: 'About us',
        },
      ]),
      BASE
    )
    expect(md).toContain(`- [About us](${BASE}/about)`)
  })

  it('maps a link to home to the root path', () => {
    const md = storyToMarkdown(
      story([
        {
          component: 'teaser',
          headline: 'Home',
          lead: doc(para('Prose.')),
          link: { fieldtype: 'multilink', linktype: 'story', cached_url: 'home' },
        },
      ]),
      BASE
    )
    expect(md).toContain(`(${BASE}/)`)
  })

  it('renders email links as mailto', () => {
    const md = storyToMarkdown(
      story([
        {
          component: 'teaser',
          headline: 'Contact',
          lead: doc(para('Prose.')),
          link: { fieldtype: 'multilink', linktype: 'email', email: 'hi@example.test' },
        },
      ]),
      BASE
    )
    expect(md).toContain('(mailto:hi@example.test)')
  })

  it('collapses a link-only blok into a bare link', () => {
    const md = storyToMarkdown(
      story([
        {
          component: 'button',
          label: 'Book a call',
          link: { fieldtype: 'multilink', linktype: 'url', url: 'https://cal.test/x' },
        },
      ]),
      BASE
    )
    expect(md).toContain('- [Book a call](https://cal.test/x)')
    expect(md).not.toContain('## Book a call')
  })

  it('renders richtext marks, lists and rules', () => {
    const md = storyToMarkdown(
      story([
        {
          component: 'text_section',
          text: doc(
            para('Bold me', [{ type: 'bold' }]),
            {
              type: 'bullet_list',
              content: [{ type: 'list_item', content: [para('One')] }],
            },
            { type: 'horizontal_rule' }
          ),
        },
      ]),
      BASE
    )
    expect(md).toContain('**Bold me**')
    expect(md).toContain('- One')
    expect(md).toContain('---')
  })

  it('turns a multi-line textarea into a bullet list', () => {
    const md = storyToMarkdown(
      story([{ component: 'teaser', headline: 'Points', text: 'One\nTwo\nThree' }]),
      BASE
    )
    expect(md).toContain('- One\n- Two\n- Three')
  })

  it('renders an unknown blok that follows the vocabulary, with no code for it', () => {
    const md = storyToMarkdown(
      story([{ component: 'brand_new_section', headline: 'Novel', lead: doc(para('Body copy.')) }]),
      BASE
    )
    expect(md).toContain('## Novel')
    expect(md).toContain('Body copy.')
  })

  it('ends with exactly one trailing newline', () => {
    expect(storyToMarkdown(story([]), BASE).endsWith('\n')).toBe(true)
    expect(storyToMarkdown(story([]), BASE).endsWith('\n\n')).toBe(false)
  })
})
