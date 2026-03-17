import { StoryblokMultilink } from '../.storyblok/types/storyblok'

export function getHref(link: StoryblokMultilink): string {
  switch (link.linktype) {
    case 'story':
      if (!link.story || !('full_slug' in link.story)) {
        return `/${link.cached_url}`
      }

      return `/${link.story.full_slug}`
    case 'url':
      return link.url
    case 'asset':
      return link.url
    case 'email':
      return `mailto:${link.email}`
    default:
      console.warn(`Unknown link type: ${link.linktype}`)
      return ''
  }
}
