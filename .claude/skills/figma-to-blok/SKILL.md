---
name: figma-to-blok
description: Turn a Figma frame (section/component URL) into a Storyblok blok — derive the schema from the design, push it to the space, sync types, and build the component. Use whenever the user shares a figma.com URL and wants it as a blok/section/component.
---

# Figma frame → Storyblok blok

Input: a Figma URL **with `node-id`** (one frame = one blok). No node-id → ask
for a frame-specific link, don't guess.

## 1. Read the design

- `mcp__claude_ai_Figma__get_screenshot` — always look at it first.
- `mcp__claude_ai_Figma__get_design_context` — reference code + tokens.
  Treat the returned code as a **layout reference only**; rewrite it in this
  repo's idiom (Tailwind 4 utilities, `next/image` + `lib/storyblok-image.ts`,
  `SbLink`, `RichTextRenderer`). Never paste it verbatim.

## 2. Derive the schema (design → fields)

Map what you SEE to the CLAUDE.md field vocabulary — model the content, not
the pixels:

| In the frame | Field | Type |
|---|---|---|
| small text above heading | `eyebrow` | text |
| heading | `headline` | text |
| intro/paragraph | `lead` / `text` | richtext |
| photo/illustration | `image` | asset (images) |
| button/link | `link` + `label`, or `links` (bloks whitelisting `button`) | link / bloks |
| repeated card/row (≥2 similar siblings) | child blok (`*_card`/`*_item`) + `items` (bloks) | bloks |
| visual variants (dark/light, left/right) | `variant` / `theme` | option |
| toggleable element | `is_*` / `has_*` | boolean |

Naming: snake_case technical name, role-suffixed (`hero_section`,
`logo_card`). Hierarchy `page` → `*Section` → `*Card`/`*Item`. Fixed
decoration (dividers, background shapes) is code, not fields. When in doubt,
fewer fields — editors can ask for more.

## 3. Push the schema to Storyblok

Management API (per CLAUDE.md: API, not MCP). Needs `STORYBLOK_OAUTH_TOKEN`
(personal access token) and `STORYBLOK_SPACE_ID` in `.env` — if the token is
missing, stop and ask the user to add it (never edit `.env` yourself).

```sh
set -a; source .env; set +a
curl -sf -X POST "https://mapi.storyblok.com/v1/spaces/${STORYBLOK_SPACE_ID}/components/" \
  -H "Authorization: ${STORYBLOK_OAUTH_TOKEN}" -H "Content-Type: application/json" \
  -d @schema.json
```

`schema.json`: `{"component": {"name": "hero_section", "is_nestable": true, "schema": {...}}}`
— field defs like the entries in `.storyblok/components/*/components.json`
(copy an existing blok's field of the same type as reference, `pos` sets
order). Root bloks whitelisted into `page.body` need the matching tag/group.
POST fails with 422 if the name exists → PUT to
`/components/:id` instead (GET the list to find the id). Schema source of
truth is the Storyblok UI — pushing overwrites, so only do this for bloks
being authored right now, and tell the user it happened.

## 4. Wire it up

1. `yarn sync` — pulls the new schema, generates `<Name>Storyblok` type.
2. Build the component following the `new-storyblok-component` skill
   (file placement, registry entry in `lib/storyblok.ts`, editable root).
   Use the step-1 screenshot as the visual target.
3. `yarn lint && yarn test` must pass.
4. Run the `storyblok-component-reviewer` agent on the new blok.

Done = blok renders from real schema types with no registry-key mismatch, and
the component visually matches the frame at desktop + mobile widths.
