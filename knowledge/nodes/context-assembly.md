---
id: 27410bf4-4dd9-46df-9717-c03587a8554e
title: File-scoped context assembly
type: concept
description: "Select budgeted discovery cards from file associations, configured
  guidance, keyword hits, and one-hop links."
dimensions:
  feature:
    - retrieval
  component:
    - cli
    - files
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: bdc35bd6-5f95-45cf-811b-b9a76de205c9
files:
  - src/cli.ts
  - src/qmd.ts
sources:
  - kind: file
    target: skills/use-kw/references/cli.md
---

# File-scoped context assembly

## Selection

kw context accepts repeated --file paths and optional search text. It selects nodes with exact files associations or local file citations, guidance rules whose file globs match, and optional QMD keyword hits. It then adds outgoing one-hop neighbors from the initially selected set. This is explicit association and keyword retrieval, not semantic inference or recursive expansion.

## Budget and obligations

Configured guidance is marked required and ordered first. Cards include reasons and required flags; --max-bytes budgets serialized cards. Omitted IDs, unresolved references, and budgetConflict remain visible. A required card can still be omitted if it does not fit; that is a conflict to resolve, not permission to ignore it. Read selected nodes for full guidance. No automatic knowledge injection is installed.
