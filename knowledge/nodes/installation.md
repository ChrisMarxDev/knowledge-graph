---
id: c1fda4a2-bbb6-41cc-ad8b-bca3b2fe8c11
title: Local installation and development
type: guide
description: Managed Git installs build committed state; source development and
  knowledge remain separate.
dimensions:
  feature:
    - tooling
  component:
    - cli
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: governed_by
    target: e6e2c384-c78e-4be1-a71b-7db18333a74e
files:
  - install.sh
  - package.json
  - bin/kw.js
  - Taskfile.yml
  - scripts/install-local.mjs
  - src/skill.ts
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

## Install the repository usage skill

Run `kw skill install` in the target project to copy the installed tool's bundled
skill and references into `skills/use-kw`. It discovers the Git root from nested
directories; outside Git it uses the selected directory. Global `--project`
selects another starting directory. No network or knowledge initialization is
required. `--dry-run` previews without writes; `--force` replaces differing
bundled files, while retaining additional local files. Identical files are left
alone. This does not edit agent setup or configure agent-specific discovery.

## Install the current checkout

For local work, task install runs npm ci, builds CLI/UI assets including uncommitted
changes, and links ~/.local/bin/kw to this checkout. KW_PREFIX chooses another
prefix. Keep the checkout in place, ensure the bin directory is on PATH, and
restart running kw view servers after rebuilding. This differs from install.sh,
which installs committed Git state. The local installer accepts its own link or
a managed Git install and refuses unrelated executables; it retains previous
managed builds. Remove the checkout link before returning to the Git installer.
