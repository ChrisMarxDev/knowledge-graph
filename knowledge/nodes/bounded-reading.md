---
id: 8baf5d11-3a23-4866-a41c-c6c562b4cc1e
title: Bounded reading and relationship traversal
type: concept
description: "Read selected document sections and traverse explicit
  relationships with continuation and result limits."
dimensions:
  feature:
    - graph
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
    target: 817d288b-1c68-4b51-9f67-5666325ec223
files:
  - src/cli.ts
  - src/core.ts
sources:
  - kind: file
    target: skills/use-kw/references/cli.md
---

# Bounded reading and relationship traversal

## Reading

kw read supports full bodies or overview cards with headings and links. --section accepts an explicit heading ID or an unambiguous title; ID#SECTION_ID is also accepted. Sections include subordinate headings. Explicit heading IDs support stable section-target links.

Line and byte budgets return totalLines, nextLine, and truncated. Line numbers are relative to the selected body or section. A line larger than the byte budget is not split; increase the budget to make progress. Map and query page independently of body reading and return nextOffset.

## Traversal and history

kw related traverses named links by direction, relation, depth, and result limit. It does not turn Markdown hyperlinks or file associations into graph edges. Unresolved links and omitted results are surfaced. kw history reads Git log --follow for a node path; it neither commits automatically nor captures uncommitted intermediate versions.
