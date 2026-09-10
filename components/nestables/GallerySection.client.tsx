'use client'

import { Carousel, Dialog } from '@sankara-ui/core'
import Image from 'next/image'
import { useState } from 'react'

export type GalleryImage = { src: string; alt: string }

export function GalleryCarousel({ images, label }: { images: GalleryImage[]; label: string }) {
  const [active, setActive] = useState<GalleryImage | null>(null)

  return (
    <>
      <Carousel label={label} perView={2.5} gap={16}>
        {images.map(image => (
          <button
            key={image.src}
            type="button"
            aria-haspopup="dialog"
            onClick={() => setActive(image)}
            className="block w-full"
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={640}
              height={480}
              className="rounded-card h-auto w-full object-cover"
            />
          </button>
        ))}
      </Carousel>
      <Dialog
        open={active !== null}
        onRequestClose={() => setActive(null)}
        size="lg"
        aria-label={active?.alt || 'Bild'}
      >
        {active && (
          <Image
            src={active.src}
            alt={active.alt}
            width={1280}
            height={960}
            className="h-auto w-full"
          />
        )}
      </Dialog>
    </>
  )
}
