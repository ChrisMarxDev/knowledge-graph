---
id: ddaf4c12-b80c-4221-828f-cd54bb946dd7
title: Graph diagnostics and conservative repairs
type: concept
description: "Inspect structural and schema problems, preview safe repairs, and
  register observed vocabulary explicitly."
dimensions:
  feature:
    - authoring
    - schema
  component:
    - cli
    - ui
    - files
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: 449a55d6-bdab-46af-b2cc-6eb5f64b782c
files:
  - src/core.ts
  - src/schema.ts
  - src/sources.ts
  - src/cli.ts
sources:
  - kind: file
    target: skills/use-kw/references/cli.md
---

# Graph diagnostics and conservative repairs

## Diagnosis

kw doctor scans graph structure, IDs, links/section targets, vocabulary, file references, citations, and optional schemas. Findings include severity, code, path, and message. Any finding yields exit 1, even warnings; operational failures are distinct. The explorer displays these diagnostics without changing authored files.

## Repair boundaries

kw fix previews by default. --safe only assigns absent IDs and wraps scalar dimension strings in lists; --dry-run always prevents writes. It does not classify knowledge, repair ambiguous references, or enforce schemas. kw meta sync previews observed undeclared vocabulary; --apply registers it with empty descriptions. It cannot distinguish deliberate names from spelling mistakes. Run doctor after intentional changes and retain unresolved findings rather than fabricate repairs.
