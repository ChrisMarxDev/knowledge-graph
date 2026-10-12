---
id: bdc35bd6-5f95-45cf-811b-b9a76de205c9
title: Selective retrieval through the QMD SDK
type: decision
description: Compose TypeScript graph primitives with QMD keyword search and
  explicit output budgets.
dimensions:
  area:
    - retrieval
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: 817d288b-1c68-4b51-9f67-5666325ec223
  - relation: governed_by
    target: 77f2fba5-7c18-4abc-8a56-51062e13f8de
files:
  - src/qmd.ts
  - src/cli.ts
sources:
  - kind: file
    target: README.md
  - kind: file
    target: agent-wiki-discussion.md
  - kind: file
    target: skills/use-kw/references/cli.md
---

# Selective retrieval through the QMD SDK

## Selected approach
The implementation uses TypeScript on Node.js and the published @tobilu/qmd 2.8.3 SDK. Earlier Go/Rust recommendations and a possible QMD fork were exploration, not the selected implementation. Composition reuses retrieval while kw owns graph identity, relationships, vocabulary, and reliable authoring.

The published SDK differs from the newer repository revision inspected during planning. kw performs exact frontmatter filtering itself using verified interfaces rather than relying on unpublished metadata APIs.

## Retrieval sequence
Start with map, query, or context; expand IDs through read and related. Repeated dimension filters combine with AND. Context combines file associations, optional configured guidance, optional keyword hits, and outgoing one-hop links. Discovery cards are not complete guidance: read the underlying nodes.

Inspect omissions, unresolved references, continuation fields, and budgetConflict. Budgets use bytes, results, and lines, not model tokens. Small results do not establish coverage.

Search refreshes configured roots and uses BM25 keyword search with a rebuildable SQLite cache. It does not generate embeddings or download models. Direct graph, query, and read operations do not need the database.
