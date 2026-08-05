import { StoryblokServerRichText, type SbReactRichTextProps } from '@storyblok/react/rsc'
import Link from 'next/link'
import { ComponentPropsWithoutRef } from 'react'

type DivProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'>

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

export function RichTextRenderer({
  text,
  ...props
}: {
  text: any
  /* `wrapper={false}` renders the nodes without the SDK's wrapper <div> — required
     when composing into `<RichText>`, whose flow spacing needs direct children */
  wrapper?: false
} & DivProps) {
  return <StoryblokServerRichText document={text} components={{ link: RichTextLink }} {...props} />
}
