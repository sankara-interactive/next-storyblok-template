---
name: new-storyblok-component
description: Use when adding a new Storyblok blok (section or component) to this template — scaffolds the file, registry entry, and types so it actually renders.
---

# Add a Storyblok component

A blok renders ONLY if all wiring steps are done. A missing/mismatched registry
key fails SILENTLY (no error, just no render).

1. **File**: `components/nestables/sections/<Name>.tsx` (a `*Section`) or
   `components/nestables/blocks/<Name>.tsx` (a leaf `*Card`/`*Item`).
   Content types go in `components/content_types/`.
2. **Component**: PascalCase, props `{ blok: <Name>Storyblok }`, spread
   `storyblokEditable(blok)` on the root element. Map `body`/`items` with
   `StoryblokServerComponent`.
3. **Registry**: add to `lib/storyblok.ts` `components: { ... }` with the key =
   the EXACT snake_case Storyblok technical name (e.g. `hero_section`).
4. **Types**: run `yarn sync` so `<Name>Storyblok` exists; type the props with it.

Naming: technical name = snake_case role-suffixed (`hero_section`, `client_card`);
field names follow the vocabulary in CLAUDE.md (`headline`, `text`, `body`,
`items`, `image`…). Whitelist shared/reusable child bloks by tag
(`section`/`shared`/`richtext`); enumerate parent-specific children explicitly.
