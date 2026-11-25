---
name: new-storyblok-component
description: Use when adding a new Storyblok blok (section or component) to this template — scaffolds the file, registry entry, and types so it actually renders.
---

# Add a Storyblok component

A blok renders ONLY if all wiring steps are done. A missing/mismatched registry
key fails SILENTLY (no error, just no render).

1. **File**: `components/nestables/<Name>.tsx` for a `*Section` or a leaf
   `*Card`/`*Item`; content types go in `components/content_types/`.
   `yarn scaffold` writes a stub for every synced blok that has no file.
2. **Component**: PascalCase, props `{ blok: <Name>Storyblok }`, spread
   `storyblokEditable(blok)` on the root element. Map `body`/`items` with
   `StoryblokServerComponent`.
3. **Registry**: add to `lib/storyblok.ts` `components: { ... }` with the key =
   the EXACT snake_case Storyblok technical name (e.g. `hero_section`).
4. **Types**: run `yarn sync` so `<Name>Storyblok` exists; type the props with it.

When the blok is authored in code rather than in the Storyblok UI, the schema
has to reach the space before step 4 can work:

5. **Baseline schema**: add the component to
   `.storyblok/components/baseline/components.baseline.json`, and add its name
   to the `component_whitelist` of every parent that may hold it (`page.body`
   for a section).
6. **Push**: `yarn storyblok components push <name> --from baseline --suffix
   baseline --space <id>`, once for the new blok and once for each changed
   parent. Then `yarn sync` and check the pulled `components.json` — the CLI
   reports "updated" for a blok it just created.
7. **Demo content**: add the blok to a story under
   `.storyblok/stories/baseline/` and push it **without `--publish`**
   (`yarn storyblok stories push --from baseline --space <id>`). Dev spaces
   publish three stories a day; drafts are enough for `yarn smoke`.
8. **Verify**: `yarn check`, then `yarn smoke`.

Naming: technical name = snake_case role-suffixed (`hero_section`, `client_card`);
field names follow the vocabulary in CLAUDE.md (`headline`, `text`, `body`,
`items`, `image`…). Whitelist shared/reusable child bloks by tag
(`section`/`shared`/`richtext`); enumerate parent-specific children explicitly.
