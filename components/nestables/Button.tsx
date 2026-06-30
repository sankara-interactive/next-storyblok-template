import { SbBlokData, storyblokEditable } from '@storyblok/react/rsc'
import type { StoryblokMultilink } from '@/.storyblok/types/storyblok'
import { SbLink } from '@/components/helpers/SbLink'

// Hand-typed like PrivacyBee — example blok, not in the committed schema. Author
// fields `label` (text), `link` (link), `variant` (option) on a `button` blok.
type ButtonBlok = SbBlokData & {
  label?: string
  link?: StoryblokMultilink
  variant?: 'primary' | 'secondary'
}

export default function Button({ blok }: { blok: ButtonBlok }) {
  if (!blok.link) return null
  return (
    <span {...storyblokEditable(blok)}>
      <SbLink
        link={blok.link}
        className={`inline-block rounded px-6 py-3 font-medium uppercase shadow hover:shadow-md ${blok.variant ?? 'primary'}`}
      >
        {blok.label}
      </SbLink>
    </span>
  )
}
