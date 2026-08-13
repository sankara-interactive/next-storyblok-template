import { TextSectionStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'
import { SbLink } from '@/components/helpers/SbLink'

export default function TextSection({ blok }: { blok: TextSectionStoryblok }) {
  return (
    <section
      className="container mx-auto px-4 py-12"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      {blok.eyebrow && <p className="text-sm uppercase tracking-wide mb-2">{blok.eyebrow}</p>}
      {blok.headline && <h2 className="text-3xl font-medium mb-4">{blok.headline}</h2>}
      {blok.lead && <RichTextRenderer text={blok.lead} className="prose mb-6" />}
      {blok.link && (
        <SbLink link={blok.link} className="underline">
          Mehr erfahren
        </SbLink>
      )}
    </section>
  )
}
