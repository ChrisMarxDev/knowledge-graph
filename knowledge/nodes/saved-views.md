---
id: f44b61ec-ffbc-41b4-9804-dfca2b5188ec
title: Named Boolean graph views
type: concept
dimensions:
  area:
    - retrieval
    - explorer
description: Saved, file-defined Boolean selections shared by query, map discovery,
  and the human explorer.
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: bdc35bd6-5f95-45cf-811b-b9a76de205c9
files:
  - src/views.ts
  - src/core.ts
  - src/cli.ts
  - src/explorer.ts
  - src/server.ts
  - ui/main.tsx
  - test/views.test.ts
sources:
  - kind: file
    target: skills/use-kw/references/cli.md
    locator: Named Boolean views
  - kind: file
    target: README.md
    locator: Saved graph views
---

# Named Boolean graph views

## Selection contract

A view is a named selection of existing collection nodes, defined by one required
filter expression. Nested and, or, and not express arbitrary Boolean combinations
of eq, in, and exists predicates. Nesting determines precedence: inclusions can be
or branches matching IDs, and exclusions can be not branches at any scope. There
are no separate include/exclude fields or fixed exclusion precedence.

Fields address top-level frontmatter or dimensions.NAME. Equality matches a scalar
or any list element; in matches any listed acceptable value. Comparisons are exact
and case-sensitive. Missing fields do not match eq or in. Empty and matches all;
empty or matches none; not requires exactly one child. Paths are not a synthetic
filter field. An unmatched ID predicate produces no missing-reference warning.

## Configuration and discovery

The project manifest accepts an inline views mapping and optional viewFiles list.
External paths resolve from the project root, and each file requires version: 1
and a views mapping. A definition requires filter, defaults title to its name, and
accepts an optional description. Duplicate names, unknown definition/filter keys,
and malformed expressions fail loading, even when no nodes match. There is no
inheritance, override order, file glob expansion, or view-to-view reference syntax.

kw views list pages definitions; kw views show NAME returns one definition.
kw map includes an independently paginated views catalog. kw query --view NAME
uses the shared evaluator, and additional query flags narrow its result before
pagination. Unknown view names fail rather than falling back to all knowledge.

## Explorer behavior

GET /api/views returns the definitions. GET /api/graph?view=NAME returns selected
nodes and edges whose endpoints are both selected; diagnostics remain collection-wide.
Snapshots include the catalog and selected name. Definition changes, including
external file edits, affect snapshot versions and are detected by polling.
The sidebar Views section lists titles and descriptions and clears temporary filters when switching views; subsequent
interactive filters narrow the selected graph. The active choice is session state.
Removing an active view produces an error until the user chooses another view or
All knowledge. Nodes are not automatically expanded through relationships.

Views are not access controls. Full-text search, node reads, and referenced-file
reads remain collection-wide. Configuration is edited in files, not through the UI.

## Current-version audit

Audited against the implementation and published CLI help on 2026-10-12. The
canonical usage contract is skills/use-kw/references/cli.md. Tests cover nested
Boolean exceptions, CLI discovery and narrowing, HTTP selection and ETags,
external-file refresh, and invalid configurations. Browser interaction was not
manually automated during this change.

## Project examples

.knowledge/views.yaml defines four sample views using the current project
vocabulary: frontend (UI/explorer concepts plus the identity node), product
(product/UI/explorer knowledge excluding constraints), retrieval (retrieval
knowledge plus identity and file-scope foundations), and development (core,
schema, tooling, and workflow). The manifest loads this file through viewFiles.
These demonstrate nested Boolean logic and explicit ID inclusions without
changing the collection's classifications. The sidebar has a dedicated Views
section with descriptions, active selection, and an All knowledge reset.

## Shared explorer navigation

Named views use the same explorer component, filter combobox, graph controls,
and reader as the general map. The page heading and browser title use the view
name; breadcrumbs show project / Knowledge map / view. The parent breadcrumb
and Knowledge map sidebar entry return to the full collection. Views are sidebar
navigation destinations rather than combobox suggestions or removable filter
chips. Clearing temporary filters preserves the selected view; switching views
clears temporary filters and reader selection. The saved Boolean expression
remains on the server and is never flattened into metadata chips.
