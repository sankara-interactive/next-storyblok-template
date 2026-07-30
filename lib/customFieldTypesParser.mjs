// Types Storyblok custom fields for `storyblok types generate`.
// Wired up via `customFieldsParser` in storyblok.config.mjs.
const str = { type: 'string' }

export default function customFieldTypesParser(key, obj) {
  switch (obj.field_type) {
    // Standard "Meta Fields" plugin — OG/Twitter fields need the paid one.
    case 'meta-fields':
      return {
        [key]: {
          type: 'object',
          properties: {
            _uid: str,
            plugin: str,
            title: str,
            description: str,
          },
        },
      }
    default:
      return {}
  }
}
