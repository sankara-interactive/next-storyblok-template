import { StoryblokMultilink } from '../.storyblok/types/storyblok'

export function getHref(link: StoryblokMultilink) {
  if (link.linktype === 'story' && link.story && 'full_slug' in link.story) {
    return `/${link.story.full_slug}`
  }

  if (link.linktype === 'url') {
    return link.url
  }

  return link.cached_url
}
