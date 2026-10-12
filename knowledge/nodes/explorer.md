---
id: 70d0b2a5-3d35-4d89-a215-0c12e58c5405
title: Read-only human knowledge explorer
type: concept
description: A connection-driven map, filter combobox, and reader share graph semantics while preserving authored files.
dimensions:
  area:
    - ui
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

The workspace is map-first with a Cytoscape.js/fCoSE network and persistent reader. Each document appears once. Color by selects type or a dimension without rearranging nodes. Overview groups exact complete membership sets and counts directed relationships; groups expand on click. Both sidebars collapse and resize. Selection highlights neighbors; neighborhood focus is explicit. Dragging pins nodes; positions persist locally. Arrange runs in a cancellable worker. The former card/edge caps are removed.

Node titles are compact and wrap without cutting off text, on canvas-colored backgrounds. Small dots within each node show dimension values independently of the main type/color fill. Dot colors match hover values and the Dimension dots legend; more than four values show three dots and a + indicator. Hover cards show descriptions, all dimensions, section/file/connection counts, and document paths. Fit avoids oversized titles for tiny filtered graphs; manual zoom remains available.

The toolbar filter combobox supports text, multiple types/dimension values, exclusions, and saved-view selection. Included values within a field use OR; different fields combine with AND; exclusions always subtract. Chips can be toggled between include/exclude or removed. Filters narrow the selected saved view without modifying its YAML definition. Enter commits a text query or the highlighted suggestion. Full-text search is a separate dropdown action; results respect metadata filters and the selected view. Exclusions refer to graph nodes, not Markdown headings.

## Boundaries
The UI does not edit authored knowledge; keyword search can rebuild the cache. Polling preserves navigation and browser storage holds view preferences. The HTTP API binds to 127.0.0.1 with local Host and same-origin GET checks.

A readable graph is not evidence by itself that agent retrieval quality or understanding has improved.
