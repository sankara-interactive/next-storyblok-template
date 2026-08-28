import { StoryblokMultilink } from '@/.storyblok/types/storyblok'

/**
 * Path for a story slug. The root story is `home` in Storyblok but `/` on the
 * site — the sitemap and the page's own canonical both say `/`, so a link
 * built as `/home` points at a reachable duplicate the sitemap disowns.
 *
 * Only the exact root slug is special: a story genuinely at `about/home` keeps
 * its path. Storyblok sends folder startpages with a trailing slash, so the
 * slug is normalized before comparing.
 */
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
      // `/` before the anchor, or an anchor on the home story would render as a
      // bare `#cta`, which resolves against whatever page the link sits on.
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
