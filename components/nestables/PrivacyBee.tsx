import { createElement } from 'react'
import Script from 'next/script'
import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'

type PrivacyBeeBlok = SbBlokData & { website_id?: string }

export default function PrivacyBee({ blok }: { blok: PrivacyBeeBlok }) {
  return (
    <div {...storyblokEditable(blok)}>
      <Script src="https://www.privacybee.ch/widget.js" strategy="afterInteractive" />
      {createElement('privacybee-widget', { 'website-id': blok.website_id ?? '', lang: 'de' })}
    </div>
  )
}
