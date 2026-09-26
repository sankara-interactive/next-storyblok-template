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
