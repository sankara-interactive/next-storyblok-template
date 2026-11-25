# Agent Guidance

This repository is the sankara:interactive Next.js + Storyblok template.

Before making changes:

1. Read [CLAUDE.md](./CLAUDE.md) for the established Storyblok architecture,
   component conventions, commands, and safety rules. The guidance applies to
   all contributors and agents despite the filename.
2. Read [docs/enhancement-roadmap.md](./docs/enhancement-roadmap.md) before
   starting enhancement work. Follow its dependency order and update its status
   when a roadmap item is started or completed.
3. Preserve the separation between reusable UI (`@sankara-ui/core`, its own
   repository), Storyblok adapters, and project-specific page sections. A
   component every project needs belongs in the package, not here.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
