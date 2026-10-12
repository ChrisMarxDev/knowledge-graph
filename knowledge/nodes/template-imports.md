---
id: 49ff8319-e7b9-4a81-890a-ce6ddec24c9b
title: Templates are adapted by agents
type: decision
description: "The CLI template/import engine was removed; agents adapt user-selected reusable files."
dimensions:
  feature:
    - schema
    - tooling
  component:
    - cli
    - files
  status:
    - accepted
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: f9f23b8e-cb57-4286-98ed-1424828f5477
files:
  - src/cli.ts
sources:
  - kind: file
    target: skills/use-kw/references/schema-templates.md
---

# Templates are adapted by agents

The user removed all template CLI functions from the current iteration. Agents
can inspect a user-selected repository and adapt its vocabulary, nodes, and
skills with ordinary file operations. Preserve intended IDs, reconcile collisions,
check file references, and run doctor after adapting content. This does not
remove optional advisory schemas or reusable skill/example files.

## Historical implementation

The retired template list/show/apply engine supported local/Git folders,
preview-before-apply, additive merging, conflict detection, and commit provenance.
It and its Git-fetch helper are no longer shipped as functionality. These prior
capabilities remain recorded here as history, not instructions for current use.
