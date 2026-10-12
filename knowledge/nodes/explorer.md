---
id: 70d0b2a5-3d35-4d89-a215-0c12e58c5405
title: Read-only human knowledge explorer
type: concept
description: A bounded map and reader share graph semantics while preserving authored files.
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

The workspace is map-first with a persistent reader, grouping by type or dimension, and a compact search/grouping toolbar. Both sidebars collapse and resize independently. Multi-valued nodes can appear in multiple groups while retaining a single identity. Selection reads without moving the camera; neighborhood focus is explicit.

Views initially show three cards per group and cap expansion at 160 cards and 1,200 edges. The graph API retains the complete collection. Full-text search is separate from title/description filtering; referenced UTF-8 files have bounded previews, and diagnostics remain visible.

## Boundaries
The UI does not edit authored knowledge; keyword search can rebuild the cache. Polling preserves navigation and browser storage holds view preferences. The HTTP API binds to 127.0.0.1 with local Host and same-origin GET checks.

Connection-driven layouts are a later proposal. The current grouped map is not evidence that agent retrieval quality or understanding has improved.
