---
id: bdc35bd6-5f95-45cf-811b-b9a76de205c9
title: Selective retrieval through the QMD SDK
type: decision
description: Compose TypeScript graph primitives with QMD keyword search and
  explicit output budgets.
dimensions:
  feature:
    - retrieval
  component:
    - cli
    - api
  status:
    - accepted
    - implemented
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
Start with query or map, then expand IDs through read and link show. Query combines
optional keyword text with exact metadata, file associations, and saved views.
Repeated dimensions combine with AND; file arguments combine with OR. Projection
can return only titles/descriptions, or retain IDs for follow-up reads.

Read includes complete frontmatter and a bounded body. Link show inspects incoming
and outgoing direct edges. Follow continuation fields and diagnose unresolved
references; record limits and body-byte budgets do not bound every response field.
Context assembly and required-guidance selection are no longer CLI features.
