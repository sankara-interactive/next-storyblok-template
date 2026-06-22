import {
  StoryblokServerRichText,
  type SbReactRichTextProps,
} from '@storyblok/react/rsc'
import Link from 'next/link'

// v7 richtext: custom marks/nodes are a component map keyed by element name.
// Embedded bloks (`blok`) render via the SDK's built-in default, so we only
// override `link` to route internal story links through next/link.
function RichTextLink({ attrs, children }: SbReactRichTextProps<'link'>) {
  const { href, target, linktype } = attrs ?? {}
  if (linktype === 'story') {
    return (
      <Link href={href ?? '#'} target={target ?? undefined}>
        {children}
      </Link>
    )
  }
  if (linktype === 'email') {
    return <a href={`mailto:${href}`}>{children}</a>
  }
  return (
    <a href={href ?? '#'} target={target ?? undefined}>
      {children}
    </a>
  )
}

export function RichTextRenderer({ text }: { text: any }) {
  return (
    <StoryblokServerRichText document={text} components={{ link: RichTextLink }} />
  )
}
