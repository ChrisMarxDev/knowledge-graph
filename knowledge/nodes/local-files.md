---
id: 77f2fba5-7c18-4abc-8a56-51062e13f8de
title: Canonical files and explicit scope
type: constraint
description: Authored files are authoritative; users choose scope and Git
  retains committed history.
dimensions:
  area:
    - core
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
files:
  - src/core.ts
sources:
  - kind: file
    target: README.md
  - kind: file
    target: agent-wiki-discussion.md
  - kind: file
    target: skills/use-kw/references/cli.md
---

# Canonical files and explicit scope

## Ownership and storage
Markdown nodes, the vocabulary map, and .knowledge/config.yaml are canonical. Users choose knowledge boundaries; the tool must not silently add company, personal, or external knowledge. Ordinary file access remains available to unfamiliar agents.

Manifest roots and metadata paths resolve against the containing project root. This collection uses knowledge/nodes and knowledge/meta.yaml. The QMD cache at .knowledge/cache/qmd.sqlite and its sidecars are disposable, Git-ignored derived data.

## History boundary
Preserving history unless explicitly removed is an accepted goal. Git is the selected history mechanism for now, but it retains committed revisions only. kw does not automatically commit or preserve every uncommitted intermediate edit. Summarizing material does not authorize deleting source evidence.
