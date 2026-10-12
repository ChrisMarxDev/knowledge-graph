---
id: 16143719-8ef0-4928-abda-e64208a05026
title: Documentation publishing with Starlight
type: decision
description: Publish CLI docs from the canonical knowledge node using a separate
  Starlight build and GitHub Pages.
dimensions:
  feature:
    - tooling
  component:
    - files
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: governed_by
    target: 8f0e952a-0d52-4d41-92cd-00e32c536ab3
files:
  - docs/package.json
  - docs/astro.config.mjs
  - docs/scripts/reference.mjs
  - .github/workflows/docs.yml
sources:
  - kind: reference
    target: Christopher documentation decision, 2026-10-12
    note: Use Starlight and link the CLI documentation site to the API surface node.
  - kind: url
    target: https://starlight.astro.build/manual-setup/
  - kind: url
    target: https://docs.astro.build/en/guides/deploy/github/
---

# Documentation publishing with Starlight

## Selected approach

The public docs use Astro Starlight and GitHub Pages. Markdown guides complement
the CLI API surface knowledge node; they do not replace it. The CLI reference is
generated directly from that node at every docs build/dev startup. Its stable ID
is validated; its body is published with a source notice and an edit link to the
original node. Changes to the node are watched during local development.
Generated reference Markdown and build output are ignored by Git.

## Local development

Run npm --prefix docs ci, then npm --prefix docs run dev. The site is served at
/knowledge-graph/. npm --prefix docs test checks source generation; npm --prefix
docs run build produces static docs/dist with search. npm --prefix docs run
preview serves the built site. Docs dependencies and lockfile are independent of
the CLI: neither install.sh nor the normal CLI/UI build installs Starlight.

## Publishing and maintenance

The Documentation GitHub Actions workflow builds/tests relevant pull requests
and pushes to main. Only successful main builds deploy to GitHub Pages, whose
source setting is GitHub Actions. Manual workflow runs are also available.
The target URL is https://chrismarxdev.github.io/knowledge-graph/.

Update the API node, implementation, help, tests, and usage skill together for
CLI changes. Edit docs/src/content/docs for human guides. Never edit the generated
reference page as an independent contract. The published reference is the version
from the latest successful deployment, so users should check installed kw help
when running older versions.

## Public documentation scope

Public docs explain installing and using kw. Documentation-site development,
publishing, and maintenance guidance belongs in this knowledge node and the
repository README/AGENTS.md, not a public guide. The former Keeping docs current
page was removed from the site and navigation at the user’s request.
