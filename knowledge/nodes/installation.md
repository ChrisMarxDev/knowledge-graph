---
id: c1fda4a2-bbb6-41cc-ad8b-bca3b2fe8c11
title: Local installation and development
type: concept
description: Managed Git installs build committed state; source development and
  knowledge remain separate.
dimensions:
  area:
    - tooling
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: governed_by
    target: fcb6e989-fa8b-4af1-b7f9-3c747268764a
files:
  - install.sh
  - package.json
  - bin/kw.js
sources:
  - kind: file
    target: README.md
  - kind: file
    target: skills/use-kw/references/cli.md
---

# Local installation and development

## Managed installation
Git, npm, and Node.js 22.12+ are required. install.sh fetches committed Git state, builds into ~/.local/share/kw, and switches ~/.local/bin/kw after validation. --repo, --ref, and --prefix select source and destination. The default source is the remote default branch. A local source path also excludes uncommitted changes.

For this checkout, reinstall with sh install.sh --repo /Users/christophermarx/dev/knowledge-graph --ref HEAD after committing CLI changes. Restart existing view servers after replacement. Failed builds preserve the previous managed install; unrelated executables are rejected. Shell profiles and project knowledge are not changed by installation.

## Development
npm run dev -- runs the TypeScript checkout. npm run build builds CLI/UI assets, then node bin/kw.js runs the built checkout. Documented validation commands are npm run check, npm test, and npm run build. Installing the usage skill is separate from installing the executable.
