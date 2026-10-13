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
  - relation: governed_by
    target: 8f60e5ac-d848-4803-8f3d-eb975bf3b1f8
  - relation: governed_by
    target: 8b5f3519-8965-4481-a913-ee6efba9222e
  - relation: governed_by
    target: fb00b9ea-f26e-4e08-a255-cdcef3f0b2c6
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

## Accepted next iteration

The contextual-explorer, stable-visual-identity, and zen-reading decision nodes
record the user's newer direction: a much smaller navigation sidebar, central
Graph/List presentations of one context, stable type colors with dimension
accents and YAML overrides, and focused full-screen reading. These are accepted
plans, not shipped capabilities. They supersede conflicting older preferences
for future implementation. The current behavior below remains accurate until
those features are built.

## Current experience
kw view starts a loopback server and opens the default browser after listening. Use --no-open to suppress launch and --port 0 for an available port. Launch failure leaves the server running. Built React/Vite assets are required even when running the CLI from source.

The workspace is map-first with a Cytoscape.js/fCoSE network and persistent reader. Each document appears once. Color by selects type or a dimension without rearranging nodes. Both sidebars collapse and resize. Selection highlights neighbors; neighborhood focus is explicit. Dragging moves nodes without locking; positions persist locally. Old pin flags are ignored. Arrange runs in a cancellable worker. The former card/edge caps are removed.

Node titles use compact 10px text and wrap without cutting off text, on canvas-colored backgrounds. Centered, evenly spaced dots within each node show dimension values independently of the main type/color fill. Dot colors match hover values and the Dimension dots legend; more than four values show three dots and a + indicator. Hover cards show descriptions, all dimensions, section/file/connection counts, and document paths. Fit avoids oversized titles for tiny filtered graphs; manual zoom remains available.

The toolbar accepts typed tags such as component:app or NOT component:app, with autocomplete after typing and no predefined filter sheet. type:guide filters node types; plain text filters titles/descriptions. Saved views open from the sidebar in the same explorer with a distinct title and breadcrumb, sharing all graph and combobox controls. Clearing filters keeps the view; Knowledge map navigation returns to the full collection. Included values within a field use OR; different fields combine with AND; exclusions always subtract. Chips use the typed syntax and can be removed to replace them. Filters narrow the selected saved view without modifying its YAML definition. Enter commits a text query or the highlighted suggestion. Full-text search is a separate dropdown action; results respect metadata filters and the selected view. Exclusions refer to graph nodes, not Markdown headings.

On desktop, the left navigation occupies layout space beside the central workspace;
opening or resizing it changes the available graph/search width. Its toggle uses
a directional chevron. Only the right reader overlays the graph and search toolbar:
opening, closing, or resizing it leaves their geometry unchanged. Narrow screens
retain sidebar overlays and show at most one sidebar at a time.

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

## Interaction preferences

User-requested behavior: ordinary trackpad/wheel scrolling pans the node view in
both axes. Only Command+scroll zooms around the pointer. Zoom buttons remain.
Left navigation uses collapsible Views, Types, Filters, and Nodes sections, with
project/origin-scoped browser persistence. Diagnostics belongs at the bottom in a
fixed utility area with Annotate UI and theme, outside the scrolling navigation.
