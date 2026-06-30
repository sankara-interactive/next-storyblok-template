import type { StoryblokMultilink } from '@/.storyblok/types/storyblok'
import Logo from '@/components/layout/Logo'
import { SbLink } from '@/components/helpers/SbLink'
import { getStory } from '@/lib/storyblok-api'

type NavLink = { _uid: string; label?: string; link?: StoryblokMultilink }
type HeaderContent = { links?: NavLink[] }

// Global header from the `data/header` story. Falls back to just the logo if the
// story is missing/unpublished, so the layout never breaks before it's authored.
export default async function Header() {
  const story = await getStory<HeaderContent>('data/header')
  const links = story?.content.links ?? []

  return (
    <header className="container mx-auto flex items-center justify-between p-4">
      <Logo />
      {links.length > 0 && (
        <nav className="flex gap-6">
          {links.map(item =>
            item.link ? (
              <SbLink key={item._uid} link={item.link} className="font-medium hover:underline">
                {item.label}
              </SbLink>
            ) : null,
          )}
        </nav>
      )}
    </header>
  )
}
