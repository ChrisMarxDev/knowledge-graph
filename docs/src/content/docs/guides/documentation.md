---
title: Keeping docs current
description: How the Starlight site publishes the canonical kw CLI contract.
---

## The knowledge node is authoritative

The [CLI API surface node](https://github.com/ChrisMarxDev/knowledge-graph/blob/main/knowledge/nodes/cli-api-surface.md)
remains the top-level CLI contract. Its stable ID is
`8f0e952a-0d52-4d41-92cd-00e32c536ab3`.

At development startup and every production build, the docs integration reads
that file and generates the [CLI reference](/knowledge-graph/reference/cli/).
It validates the node's identity, carries over its title and description, and
publishes its body. Starlight provides the page heading. The source link and
Edit page link point to the original knowledge node.

The generated Markdown and built HTML are ignored by Git. Changes to the source
node are watched during local development. Do not hand-edit the generated page
or create a second CLI contract in the docs tree.

## Develop locally

From the repository root:

```sh
npm --prefix docs ci
npm --prefix docs run dev
```

Open the URL printed by Astro, including the `/knowledge-graph/` path.

```sh
npm --prefix docs test
npm --prefix docs run build
npm --prefix docs run preview
```

Docs have a separate package and lockfile. Installing or building kw does not
install or build Starlight. The docs build needs no QMD index or model downloads.

## Publishing

GitHub Actions builds the docs for pull requests and relevant pushes to `main`.
Successful main-branch builds deploy to GitHub Pages. The workflow also supports
manual runs. Repository Pages settings must use **GitHub Actions** as the source.

Public guides live under `docs/src/content/docs`. For CLI changes, update the
knowledge node, implementation, help, tests, and the usage skill together. Update
these guides when a workflow changes; their examples complement the reference.
