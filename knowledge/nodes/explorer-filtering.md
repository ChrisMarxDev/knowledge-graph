---
id: 6420fd83-dcc2-45d5-b3d0-9f517383b291
title: Interactive graph filtering and search
type: concept
description: "Narrow any map or saved view with typed metadata tags
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

The shared combobox accepts individual tags such as component:app, NOT component:app, and type:guide. Autocomplete uses observed vocabulary after typing; no predefined filter sheet or Include/Exclude switch remains. Quote names/values containing spaces or colons; NOT is case-insensitive. Tags are not full Boolean expressions. Included values within one field combine with OR; distinct fields combine with AND; exclusions subtract matches. A missing dimension survives exclusion of one of its values. Chips do not represent arbitrary nested saved-view expressions.

Enter selects a suggestion or commits title/description text. Search document contents invokes QMD separately and intersects returned hits with current view, metadata, neighborhood, and relation constraints. It can find a body match without matching the node title. Results are bounded by the search endpoint; filtering its returned hits is not an exhaustive search over a view.

## Shared explorer

Views remain sidebar destinations using the same Graph/List context, combobox, and reader. Their breadcrumbs identify the selection. Clearing filters retains the view; All knowledge navigation returns to all nodes. Switching views resets temporary filters and reader selection. These actions never rewrite a saved definition. Exclusions hide nodes, not document heading sections.

Full-text search opens List and constrains both presentations to returned matches;
List shows snippets. Metadata chips can further narrow active results. Removing
Document search restores title/description matching. The Filters popover exposes relationship and neighborhood constraints. There is one
Clear filters action beside the combobox, without separate sidebar filters.
