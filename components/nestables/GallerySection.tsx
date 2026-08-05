import { GallerySectionStoryblok } from '@storyblok-component-types'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import { Heading } from '@sankara-ui/core'
import { GalleryCarousel } from '@/components/helpers/GalleryCarousel'

export default function GallerySection({ blok }: { blok: GallerySectionStoryblok }) {
  /* Adapter boundary: CMS assets become plain serialisable props before the
     client component — no Storyblok types cross into the UI layer */
  const images = (blok.images ?? [])
    .filter(asset => asset.filename)
    .map(asset => ({ src: asset.filename as string, alt: asset.alt ?? '' }))

  return (
    <section
      className="container mx-auto px-4 py-12"
      {...storyblokEditable(blok as unknown as SbBlokData)}
    >
      {blok.headline && (
        <Heading level={2} className="mb-4">
          {blok.headline}
        </Heading>
      )}
      {images.length > 0 && <GalleryCarousel images={images} label={blok.headline || 'Galerie'} />}
    </section>
  )
}
