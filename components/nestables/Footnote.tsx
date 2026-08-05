import { FootnoteStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import { RichText } from '@sankara-ui/core'
import { FootnotePopover } from '@/components/helpers/FootnotePopover'
import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'

/* Embedded in richtext fields: renders a small trigger button whose popover
   holds the footnote text. The popover content is rendered server-side and
   passed through the client boundary as children. */
export default function Footnote({ blok }: { blok: FootnoteStoryblok }) {
  return (
    <span {...storyblokEditable(blok as unknown as SbBlokData)}>
      <FootnotePopover label={blok.label || '›'}>
        {blok.text && (
          <RichText>
            <RichTextRenderer text={blok.text} wrapper={false} />
          </RichText>
        )}
      </FootnotePopover>
    </span>
  )
}
