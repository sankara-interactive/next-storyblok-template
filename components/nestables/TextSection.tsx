import { TextSectionStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'
import { SbLink } from '@/components/helpers/SbLink'

export default function TextSection({ blok }: { blok: TextSectionStoryblok }) {
  const HeadingTag = blok.level === 'h3' ? 'h3' : 'h2'
  return (
    <section
      className="container mx-auto px-4 py-12"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      {blok.eyebrow && <p className="text-sm uppercase tracking-wide mb-2">{blok.eyebrow}</p>}
      {blok.headline && <HeadingTag className="mb-4">{blok.headline}</HeadingTag>}
      {blok.lead && <RichTextRenderer text={blok.lead} className="sankara-richtext mb-6" />}
      {blok.link && (
        <SbLink link={blok.link} className="rounded-card inline-block border px-4 py-2">
          {blok.label || 'Mehr erfahren'}
        </SbLink>
      )}
    </section>
  )
}
