import { FaqSectionStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable, StoryblokServerComponent } from '@storyblok/react/rsc'

export default function FaqSection({ blok }: { blok: FaqSectionStoryblok }) {
  return (
    <section
      className="container mx-auto px-4 py-12"
      itemScope
      itemType="https://schema.org/FAQPage"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      {blok.headline && <h2 className="text-3xl font-medium mb-4">{blok.headline}</h2>}
      {blok.items?.map(item => (
        <StoryblokServerComponent blok={item} key={item._uid} groupName={`faq-${blok._uid}`} />
      ))}
    </section>
  )
}
