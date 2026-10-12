---
id: f44b61ec-ffbc-41b4-9804-dfca2b5188ec
title: Named Boolean graph views
type: concept
dimensions:
  feature:
    - graph
    - retrieval
    - explorer
  component:
    - cli
    - api
    - ui
    - files
  status:
    - implemented
description: Saved, file-defined Boolean selections shared by query, map
  discovery, and the human explorer.
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

.knowledge/views.yaml defines eleven views using the current project vocabulary.
The manifest loads them through viewFiles; these are real selections over this
repository's knowledge, not fabricated demo nodes.

| View | Purpose | Selection example |
| --- | --- | --- |
| Frontend & explorer | UI implementation and shared identity | Nested AND inside OR, plus an explicit ID inclusion |
| Product overview | Direction and visible capabilities | Feature membership AND NOT rules |
| Retrieval & context | Queries and their foundations | Feature match OR an explicit list of IDs |
| Development foundations | Graph, authoring, schemas, tooling | Multiple acceptable feature values |
| Start here | Project, installation, identity, maintenance | Curated stable IDs across types and features |
| Engineering guardrails | Constraints with a sources field | Rule type equality AND field existence |
| Direction & open questions | Goals and unresolved questions | OR selection with a grouped type exclusion |
| Metadata review | Missing/blank metadata | OR of missing-field and blank-string predicates |
| Highlighted truth | Explicitly designated source truth | Status membership; initially empty |
| UI-facing knowledge | Implemented UI behavior | Component AND status selection |
| Practical guides | Installation and maintenance instructions | Guide type equality |

Metadata review is intentionally empty while the collection passes its checks.
It checks absent fields and blank descriptions/types, not empty arrays, whitespace,
or malformed values; use doctor for broader validation. Engineering guardrails
checks presence of sources, not whether the citations are nonempty or valid.
All six supported filter operators (eq, in, exists, and, or, not) appear in these
examples. No missing metadata or broken links are manufactured to populate views.

In the app, open Frontend & explorer to inspect connected nodes, then filter by
Type: concept and exclude feature: graph to narrow the graph. Retrieval & context
includes the saved-views node with multiple feature values for color/legend behavior.
Development foundations offers both concepts, rules, and guides for type filtering.
Start here spans features and provides the project entry point, file associations,
and citations for reader exploration. Switching views changes the heading and
breadcrumb; Clear filters retains the selection and Knowledge map returns to all
nodes. Search document contents stays constrained to the current view.

## Shared explorer navigation

Named views use the same explorer component, filter combobox, graph controls,
and reader as the general map. The page heading and browser title use the view
name; breadcrumbs show project / Knowledge map / view. The parent breadcrumb
and Knowledge map sidebar entry return to the full collection. Views are sidebar
navigation destinations rather than combobox suggestions or removable filter
chips. Clearing temporary filters preserves the selected view; switching views
clears temporary filters and reader selection. The saved Boolean expression
remains on the server and is never flattened into metadata chips.
