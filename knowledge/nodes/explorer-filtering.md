---
id: 6420fd83-dcc2-45d5-b3d0-9f517383b291
title: Interactive graph filtering and search
type: concept
description: "Narrow any map or saved view with include/exclude metadata chips
  and scoped text search."
dimensions:
  feature:
    - explorer
    - retrieval
  component:
    - ui
    - api
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: f44b61ec-ffbc-41b4-9804-dfca2b5188ec
files:
  - ui/FilterCombobox.tsx
  - ui/filter-model.ts
  - ui/main.tsx
sources:
  - kind: file
    target: skills/use-kw/references/cli.md
---

# Interactive graph filtering and search

## Filter semantics

The shared combobox offers observed types and dimension values as include/exclude chips. Included values within one field combine with OR; distinct fields combine with AND; exclusions subtract matches. A missing dimension survives exclusion of one of its values. Chips do not represent arbitrary nested saved-view expressions.

Enter selects a suggestion or commits title/description text. Search document contents invokes QMD separately and intersects returned hits with current view, metadata, neighborhood, and relation constraints. It can find a body match without matching the node title. Results are bounded by the search endpoint; filtering its returned hits is not an exhaustive search over a view.

## Shared explorer

Views remain sidebar destinations using the same map, combobox, graph controls, and reader. Their headings and breadcrumbs identify the selection. Clearing filters retains the view; Knowledge map navigation returns to all nodes. Switching views resets temporary filters and reader selection. These actions never rewrite a saved definition. Exclusions hide nodes, not document heading sections.
