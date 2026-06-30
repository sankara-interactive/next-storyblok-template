import type { StoryblokMultilink } from '@/.storyblok/types/storyblok'
import { SbLink } from '@/components/helpers/SbLink'
import { SITE_NAME } from '@/lib/config'
import { getStory } from '@/lib/storyblok-api'

type NavLink = { _uid: string; label?: string; link?: StoryblokMultilink }
type FooterContent = { links?: NavLink[]; copyright?: string }

// Global footer from the `data/footer` story. Fallback-safe like the header.
export default async function Footer() {
  const story = await getStory<FooterContent>('data/footer')
  const content = story?.content
  const copyright = content?.copyright || `© ${new Date().getFullYear()} ${SITE_NAME}`

  return (
    <footer className="container mx-auto flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>{copyright}</p>
      {content?.links?.length ? (
        <nav className="flex gap-4">
          {content.links.map(item =>
            item.link ? (
              <SbLink key={item._uid} link={item.link} className="hover:underline">
                {item.label}
              </SbLink>
            ) : null,
          )}
        </nav>
      ) : null}
    </footer>
  )
}
