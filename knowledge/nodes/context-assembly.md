---
id: 27410bf4-4dd9-46df-9717-c03587a8554e
title: File-scoped and projected queries
type: concept
description: "Use query to combine file associations, keyword text, metadata, and compact result projections."
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

# File-scoped and projected queries

Query is the primary discovery primitive. `kw query [text]` intersects optional
keyword hits with metadata and saved views. `--file PATH` matches files and
file-kind sources by exact normalized project-relative path; repeat for OR.
`--fields title,description` emits only those fields. Include id/path to retain
pointers for further reading. Filters run before pagination and keyword order is
preserved. Without text, no QMD cache is needed.

Follow nextOffset for additional records. Projection reduces metadata output but
is not a byte budget or completeness guarantee. Read returns full frontmatter;
link show exposes incoming/outgoing relationships for further chosen reads.

## Superseded context workflow

Earlier context assembled file matches, configured required guidance, keyword
hits, and one-hop links into budgeted cards. That command and selection policy
were removed in the CLI simplification. Nonempty legacy guidance produces a
doctor warning; migrate intended associations/workflows explicitly. Context
composition belongs to the agent, not an implicit CLI rule. No automatic
injection is installed.
