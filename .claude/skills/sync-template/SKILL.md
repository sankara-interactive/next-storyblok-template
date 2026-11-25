---
name: sync-template
description: Use when bringing next-storyblok-template changes into a site built from it, or when checking whether a template change will land cleanly on the sites built from it.
---

# Sync a site with the template

Sites descend from this template in one of two ways, and which one decides the
whole procedure, so check it first:

- **Fork**: shares history with the template (a `template` remote). Sync by
  `git merge`.
- **Copy**: no shared history. Sync by porting changes by hand.

The site repo's own `CLAUDE.md` records which way it was derived and what it
deliberately does differently. Site specifics live there, not here: this repo
is public.

Not recorded: `git log --oneline | tail -1` in both repos. A shared root commit
means fork; anything else is a copy.

## Always

- Work on a branch in the site repo (`chore/sync-template`), never on `main`.
- Record the template commit you synced to in the PR description
  (`Template synced to <sha>`). For a copy, that line is the only record of
  where the next sync starts.
- Finish with the site's own `yarn check` and `yarn build`, then look at a real
  page in `yarn dev`.

## Fork (merge)

```bash
git remote get-url template || git remote add template git@github.com:sankara-interactive/next-storyblok-template.git
git fetch template
git merge template/main
```

Conflicts cluster where the site customised the template. Resolve by keeping
the site's intent and adopting the template's mechanism:

- `lib/storyblok-routes.ts` — the site adds folder cache tags.
- `lib/getHref.ts` — the site routes through `pathFromSlug`.
- `lib/storyblok.ts` — the component registry; keep both sides' entries.
- Section components the site restyled (`TextSection`, …), `package.json`.
- `tsconfig.json` — the `@storyblok-component-types` path names a space id;
  keep the site's.

After merging, drop the template's demo content the site does not use: the
baseline stories under `.storyblok/stories/baseline/` (home, about, `data/*`,
redirects) and the template's space directories
(`.storyblok/{components,types}/294223376817452/`).

## Copy (port)

1. List what changed since the last sync:
   `git -C ../next-storyblok-template log --oneline <last-synced-sha>..main`.
   No recorded sha → ask the user rather than guess.
2. Port per change, not per file: read each commit's diff and its PR
   description (the rationale lives there), then apply the same change in the
   site's own structure.
3. Skip what the site deliberately does differently (its `CLAUDE.md` lists
   it), and say so in the PR.

## Checking a template change before merging it here

For each descendant site: would this merge cleanly (fork) or port in one step
(copy)? Note the follow-ups in the template PR description, without
security-relevant site details: the description is public too.
