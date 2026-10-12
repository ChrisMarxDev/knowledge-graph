---
id: 70d0b2a5-3d35-4d89-a215-0c12e58c5405
title: Read-only human knowledge explorer
type: concept
description: A connection-driven map, filter combobox, and reader share graph
  semantics while preserving authored files.
dimensions:
  feature:
    - explorer
  component:
    - ui
    - api
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: 817d288b-1c68-4b51-9f67-5666325ec223
  - relation: depends_on
    target: bdc35bd6-5f95-45cf-811b-b9a76de205c9
files:
  - src/server.ts
  - src/explorer.ts
  - src/browser.ts
  - ui
sources:
  - kind: file
    target: README.md
  - kind: file
    target: agent-wiki-discussion.md
  - kind: file
    target: skills/use-kw/references/cli.md
---

# Read-only human knowledge explorer

## Current experience
kw view starts a loopback server and opens the default browser after listening. Use --no-open to suppress launch and --port 0 for an available port. Launch failure leaves the server running. Built React/Vite assets are required even when running the CLI from source.

The workspace is map-first with a Cytoscape.js/fCoSE network and persistent reader. Each document appears once. Color by selects type or a dimension without rearranging nodes. Both sidebars collapse and resize. Selection highlights neighbors; neighborhood focus is explicit. Dragging moves nodes without locking; positions persist locally. Old pin flags are ignored. Arrange runs in a cancellable worker. The former card/edge caps are removed.

Node titles use compact 10px text and wrap without cutting off text, on canvas-colored backgrounds. Centered, evenly spaced dots within each node show dimension values independently of the main type/color fill. Dot colors match hover values and the Dimension dots legend; more than four values show three dots and a + indicator. Hover cards show descriptions, all dimensions, section/file/connection counts, and document paths. Fit avoids oversized titles for tiny filtered graphs; manual zoom remains available.

The toolbar accepts typed tags such as component:app or NOT component:app, with autocomplete after typing and no predefined filter sheet. type:guide filters node types; plain text filters titles/descriptions. Saved views open from the sidebar in the same explorer with a distinct title and breadcrumb, sharing all graph and combobox controls. Clearing filters keeps the view; Knowledge map navigation returns to the full collection. Included values within a field use OR; different fields combine with AND; exclusions always subtract. Chips use the typed syntax and can be removed to replace them. Filters narrow the selected saved view without modifying its YAML definition. Enter commits a text query or the highlighted suggestion. Full-text search is a separate dropdown action; results respect metadata filters and the selected view. Exclusions refer to graph nodes, not Markdown headings.

Both sidebars overlay the central workspace at every screen size, including the
search toolbar. Opening, closing, or resizing them leaves the graph viewport,
node positions, and search-bar geometry unchanged. Their widths are independent;
narrow screens still show at most one sidebar at a time.

## Boundaries
The UI does not edit authored knowledge; keyword search can rebuild the cache. Polling preserves navigation and browser storage holds view preferences. The HTTP API binds to 127.0.0.1 with local Host and same-origin GET checks.

A readable graph is not evidence by itself that agent retrieval quality or understanding has improved.

## Visual feedback

Annotate UI in the left sidebar enables the lazily loaded Agentation toolbar.
Users annotate elements and copy structured feedback into an agent chat; Done
closes it. A selectable output fallback appears after Copy. No MCP endpoint or
webhook is configured. Notes are browser-local, scoped by project/origin using a
temporary URL hash, and retained for seven days. Graph notes need node names
because Cytoscape renders one canvas rather than individual DOM nodes.

The reader uses the full right-side viewport height and hides when no node,
file, or diagnostics are selected. Details/Connections live in its top bar;
type and dimensions share colored chips. The expanded document has no section
index and omits its opening heading when it repeats the reader title. Neighborhood focus is a header icon. Sidebar toggles
sit at the screen top and the left sidebar uses a single edge-aligned scrollbar.
