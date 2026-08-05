import { FaqItemStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import { Disclosure, Heading, RichText } from '@sankara-ui/core'
import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'

export default function FaqItem({
  blok,
  groupName,
}: {
  blok: FaqItemStoryblok
  /* `<details name>` groups document-wide, so the parent section scopes it by its own _uid */
  groupName?: string
}) {
  return (
    <Disclosure
      name={groupName}
      summary={
        <Heading level={3} visual={4} itemProp="name">
          {blok.question}
        </Heading>
      }
      itemScope
      itemProp="mainEntity"
      itemType="https://schema.org/Question"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      <div itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer">
        {blok.answer && (
          <RichText itemProp="text">
            <RichTextRenderer text={blok.answer} wrapper={false} />
          </RichText>
        )}
      </div>
    </Disclosure>
  )
}
