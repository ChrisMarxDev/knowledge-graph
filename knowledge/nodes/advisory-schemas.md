---
id: 449a55d6-bdab-46af-b2cc-6eb5f64b782c
title: Advisory vocabulary schemas
type: concept
description: "Analyze required metadata, dimension values, and relationship
  constraints without blocking authoring."
dimensions:
  feature:
    - schema
  component:
    - cli
    - files
    - ui
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
files:
  - src/schema.ts
  - src/core.ts
sources:
  - kind: file
    target: skills/use-kw/references/schema-templates.md
---

# Advisory vocabulary schemas

## Supported behavior

Optional schema mappings live under type, dimension, and relation definitions in meta.yaml. Types may require nonempty fields; dimensions may restrict values. Relations may restrict source/target types, forbid pairs or self-links, and bound outgoing cardinality. Unresolved references remain structural findings rather than guessed endpoints.

Doctor evaluates these rules and reports warnings, including invalid schema definitions. Invalid rules skip that definition's schema while other checks continue. Findings appear in the explorer diagnostics. Doctor exits 1 for any findings, including warnings.

## Advisory contract

Create, set, and link do not enforce these schemas. fix --safe does not infer values or repair relations to satisfy them. There is no semantic inference or cycle analysis. This repository's current vocabulary descriptions are conventions; a description alone is not an enforced schema.
