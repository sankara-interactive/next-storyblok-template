// Maps Storyblok custom field types to JSON-schema so `storyblok types generate`
// can type them. Passed via `--custom-fields-parser` in the `sync` script.
const str = { type: 'string' }

export default function customFieldTypesParser(key, obj) {
  switch (obj.field_type) {
    // Storyblok "Meta Fields" plugin. The standard plugin exposes only these
    // fields; Open Graph and Twitter fields belong to a different plugin.
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
