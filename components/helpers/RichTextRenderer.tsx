import {
  BlockTypes,
  MarkTypes,
  StoryblokServerRichText,
  StoryblokServerComponent,
  type StoryblokRichTextNode,
} from '@storyblok/react/rsc'
import Link from 'next/link'
import { ReactElement } from 'react'

export function RichTextRenderer({ text }: { text: any }) {
  const resolvers = {
    [MarkTypes.LINK]: (node: StoryblokRichTextNode<ReactElement>) => {
      return node.attrs?.linktype === 'story' ? (
        <Link href={node.attrs?.href} target={node.attrs?.target}>
          {node.text}
        </Link>
      ) : node.attrs?.linktype === 'email' ? (
        <a href={`mailto:${node.attrs?.href}`}>{node.text}</a>
      ) : (
        <a href={node.attrs?.href} target={node.attrs?.target}>
          {node.text}
        </a>
      )
    },
    [BlockTypes.COMPONENT]: (node: StoryblokRichTextNode<ReactElement>) => {
      return <StoryblokServerComponent blok={node} />
    },
  }

  return <StoryblokServerRichText doc={text} resolvers={resolvers} />
}
