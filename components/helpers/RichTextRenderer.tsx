import { StoryblokServerRichText, type SbReactRichTextProps } from '@storyblok/react/rsc'
import { ComponentPropsWithoutRef } from 'react'
import type { StoryblokMultilink } from '@/.storyblok/types/storyblok'
import { Link } from '@/i18n/navigation'
import { getHref } from '@/lib/getHref'

type DivProps = Omit<ComponentPropsWithoutRef<'div'>, 'children'>

function RichTextLink({ attrs, children }: SbReactRichTextProps<'link'>) {
  const { href, target, linktype, anchor } = attrs ?? {}
  if (linktype === 'story') {
    // The stored href is a bare slug (`about`), which a browser resolves
    // relative to the current page.
    const link = {
      linktype,
      cached_url: href ?? '',
      anchor: anchor ?? undefined,
    } as StoryblokMultilink
    return (
      <Link href={getHref(link)} target={target ?? undefined}>
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
} & DivProps) {
  return <StoryblokServerRichText document={text} components={{ link: RichTextLink }} {...props} />
}
