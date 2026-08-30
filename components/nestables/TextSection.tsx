import { TextSectionStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import { Button, Heading, RichText } from '@sankara-ui/core'
import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'
import { SbLink } from '@/components/helpers/SbLink'

export default function TextSection({ blok }: { blok: TextSectionStoryblok }) {
  return (
    <section
      className="container mx-auto px-4 py-12"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      {blok.eyebrow && <p className="text-sm uppercase tracking-wide mb-2">{blok.eyebrow}</p>}
      {blok.headline && (
        <Heading level={blok.level === 'h3' ? 3 : 2} className="mb-4">
          {blok.headline}
        </Heading>
      )}
      {blok.lead && (
        <RichText className="mb-6">
          <RichTextRenderer text={blok.lead} wrapper={false} />
        </RichText>
      )}
      {blok.link && (
        <Button render={<SbLink link={blok.link} />} className="rounded-card border px-4 py-2">
          {blok.label || 'Mehr erfahren'}
        </Button>
      )}
    </section>
  )
}
