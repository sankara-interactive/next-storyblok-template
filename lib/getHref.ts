import { StoryblokMultilink } from '@/.storyblok/types/storyblok'

/** The root story is `home` in Storyblok but `/` on the site; `about/home` is not. */
function storyPath(slug: string): string {
  const normalized = slug.replace(/\/+$/, '')
  return normalized === 'home' ? '' : `/${normalized}`
}

/** A multilink an editor set and then cleared stays an object with empty fields. */
export function hasLink(link?: StoryblokMultilink | null): link is StoryblokMultilink {
  return Boolean(
    link && (link.id || link.url || link.cached_url || ('email' in link && link.email))
  )
}

export function getHref(link: StoryblokMultilink): string {
  const anchor = link.anchor ? `#${link.anchor}` : ''

  switch (link.linktype) {
    case 'story': {
      const slug =
        link.story && 'full_slug' in link.story ? link.story.full_slug : (link.cached_url ?? '')
      // Add `/` before the anchor so the root story does not become a bare `#cta`.
      const path = storyPath(slug) || '/'
      return `${path}${anchor}`
    }
    case 'url':
    case 'asset':
      return link.url
    case 'email':
      return `mailto:${link.email}`
    default:
      // The union is exhaustive, but linktype comes from the CMS unvalidated.
      console.warn(`Unknown link type: ${(link as StoryblokMultilink).linktype}`)
      return ''
  }
}
