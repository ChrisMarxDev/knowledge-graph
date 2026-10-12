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

kw read includes complete frontmatter with custom fields in full and overview modes; full adds a bounded body and overview adds headings and links. --section accepts an explicit heading ID or an unambiguous title; ID#SECTION_ID is also accepted. Sections include subordinate headings. Explicit heading IDs support stable section-target links.

Line and byte budgets return totalLines, nextLine, and truncated. Line numbers are relative to the selected body or section. A line larger than the byte budget is not split; increase the budget to make progress. Map and query page independently of body reading and return nextOffset.

## Direct relationships and history

kw link show scans incoming and outgoing direct edges, filtered by direction or
relation and paged with limit/offset. It includes section targets and unresolved
statuses. Read outgoing targets or incoming source IDs as needed; there is no
multi-hop traversal command. Use Git directly for committed history.
