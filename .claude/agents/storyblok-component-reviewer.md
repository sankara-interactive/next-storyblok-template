---
name: storyblok-component-reviewer
description: Reviews a newly added/modified Storyblok blok against this template's conventions.
tools: Read, Grep, Glob
---

Check, and report any failures with file:line:

1. Registry: a `lib/storyblok.ts` entry exists; key is EXACT camelCase technical name.
2. Editable: `storyblokEditable(blok)` spread on the component root.
3. Server/client: component is a server component unless it needs interaction
   (then a minimal `'use client'` island only).
4. Types: props use the generated Storyblok type — the component's PascalCase
   name + `Storyblok` suffix (e.g. `HeroSectionStoryblok`); no `any`.
5. Naming: PascalCase file 1:1 with technical name; correct folder
   (content_types / nestables/sections / nestables/components).
6. Field names follow the CLAUDE.md vocabulary.
7. Child whitelisting is by tag, not enumeration.
