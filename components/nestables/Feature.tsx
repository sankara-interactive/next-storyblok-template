import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import { FeatureStoryblok } from '../../.storyblok/types/202685/storyblok-components'
import { RichTextRenderer } from '../helpers/RichTextRenderer'

export default function Feature({ blok }: { blok: FeatureStoryblok }) {
  return (
    <div className="p-6 bg-gray-100" {...storyblokEditable(blok as SbBlokData)}>
      <h2 className="font-medium text-2xl mb-4">{blok.headline}</h2>
      {blok.text && <RichTextRenderer text={blok.text} />}
    </div>
  )
}
