import { StoryblokMultilink } from '@/.storyblok/types/storyblok'

/** The root story is `home` in Storyblok but `/` on the site; `about/home` is not. */
function storyPath(slug: string): string {
  const normalized = slug.replace(/\/+$/, '')
  return normalized === 'home' ? '' : `/${normalized}`
}

export function getHref(link: StoryblokMultilink): string {
  const anchor = link.anchor ? `#${link.anchor}` : ''

  switch (link.linktype) {
    case 'story': {
      const slug =
        link.story && 'full_slug' in link.story ? link.story.full_slug : (link.cached_url ?? '')
      // `/` before the anchor, or the root story's would render as a bare `#cta`.
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
