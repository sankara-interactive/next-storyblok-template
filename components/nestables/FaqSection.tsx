import { FaqSectionStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable, StoryblokServerComponent } from '@storyblok/react/rsc'
import { Heading } from '@sankara-ui/core'

export default function FaqSection({ blok }: { blok: FaqSectionStoryblok }) {
  return (
    <section
      className="container mx-auto px-4 py-12"
      itemScope
      itemType="https://schema.org/FAQPage"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      {blok.headline && (
        <Heading level={2} className="mb-4">
          {blok.headline}
        </Heading>
      )}
      {blok.items?.map(item => (
        <StoryblokServerComponent blok={item} key={item._uid} groupName={`faq-${blok._uid}`} />
      ))}
    </section>
  )
}
