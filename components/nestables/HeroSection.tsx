import { HeroSectionStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import Image from 'next/image'
import { RichTextRenderer } from '@/components/helpers/RichTextRenderer'
import { SbLink } from '@/components/helpers/SbLink'
import { hasLink } from '@/lib/getHref'

export default function HeroSection({ blok }: { blok: HeroSectionStoryblok }) {
  return (
    <section
      className="container mx-auto px-4 py-16"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      {blok.eyebrow && <p className="mb-2 text-sm tracking-wide uppercase">{blok.eyebrow}</p>}
      <h1 className="mb-4">{blok.headline}</h1>
      {blok.lead && <RichTextRenderer text={blok.lead} className="sankara-richtext mb-6" />}
      {hasLink(blok.link) && blok.label && (
        <SbLink link={blok.link} className="rounded-card inline-block border px-4 py-2">
          {blok.label}
        </SbLink>
      )}
      {blok.image?.filename && (
        <Image
          src={blok.image.filename}
          alt={blok.image.alt ?? ''}
          width={1600}
          height={900}
          sizes="100vw"
          priority
          className="rounded-card mt-8 h-auto w-full object-cover"
        />
      )}
    </section>
  )
}
