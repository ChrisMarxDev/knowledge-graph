---
title: Knowledge that stays with your project
description: Use kw to find, read, and connect local project knowledge from the command line.
---

**A little more connected.** kw turns ordinary Markdown files into a local
knowledge graph that agents can query and people can explore.

Keep the knowledge in your repository. Give each document a stable ID, describe
it with your own vocabulary, and connect it to the decisions, rules, and source
files that explain your project.

```sh
kw query --file src/payments.ts --fields id,title,description
kw read NODE_ID
kw link show NODE_ID
```

## Start here

- [Getting started](/knowledge-graph/guides/getting-started/) — install kw and create your first collection.
- [CLI workflows](/knowledge-graph/guides/workflows/) — query selectively, follow relationships, and maintain knowledge.
- [CLI API reference](/knowledge-graph/reference/cli/) — all 17 commands and their contracts, published from our authoritative knowledge node.

## Files first

Nodes are Markdown documents with YAML frontmatter. Types, dimensions, and
relationship names are yours to define. Agents can edit the files directly;
the CLI adds collection-wide filtering, stable-ID lookup, backlinks, and diagnostics.

Metadata queries and graph reads work without a database. Keyword search uses a
rebuildable local QMD cache. Embeddings and vector search are not exposed yet.

## Explore the connections

```sh
kw view
```

Open the local graph, filter by type or dimension, and read connected documents.
The explorer is read-only. Changes to authored files remain ordinary file edits.

## One reference, one source

The CLI reference is generated from the same
[API surface node](https://github.com/ChrisMarxDev/knowledge-graph/blob/main/knowledge/nodes/cli-api-surface.md)
used by agents working on kw. Updating that node updates the published reference
on the next build. [How documentation stays current](/knowledge-graph/guides/documentation/).
