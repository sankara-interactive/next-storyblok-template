// Maps Storyblok custom field types to JSON-schema so `storyblok types generate`
// can type them. Passed via `--custom-fields-parser` in the `sync` script.
const str = { type: 'string' }

export default function customFieldTypesParser(key, obj) {
  switch (obj.field_type) {
    // Storyblok "Meta Tags" plugin (SEO). Full field set so `seo.og_image` etc.
    // are typed at the read site instead of cast to Record<string, string>.
    case 'meta-fields':
      return {
        [key]: {
          type: 'object',
          properties: {
            _uid: str,
            plugin: str,
            title: str,
            description: str,
            og_title: str,
            og_description: str,
            og_image: str,
            twitter_title: str,
            twitter_description: str,
            twitter_image: str,
          },
        },
      }
    default:
      return {}
  }
}
