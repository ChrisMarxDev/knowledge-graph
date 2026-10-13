---
id: 8f60e5ac-d848-4803-8f3d-eb975bf3b1f8
title: Contextual views with Graph and List presentations
type: decision
description: "Make contextual knowledge the navigation model; give Graph and List equal standing while reducing sidebar duplication."
dimensions:
  feature: [product, explorer]
  component: [ui]
  status: [accepted]
links:
  - relation: part_of
    target: 70d0b2a5-3d35-4d89-a215-0c12e58c5405
files: []
sources:
  - kind: reference
    target: User explorer direction discussion, 2026-10-13
    note: Accepted intent and planned behavior; distinguish proposals from implementation.
---

# Contextual views with Graph and List presentations

## Intent

Help people understand connected project knowledge and inspect relevant sets of
nodes without requiring knowledge of filesystem organization. Do not drift into
a general-purpose document workspace or a weaker Obsidian/Notion clone. Contextual
views should be the learned navigation model; do not introduce a tree of all files
as the primary structure. File paths remain provenance, not navigation hierarchy.

## Accepted direction

A view defines which knowledge is in scope. Graph and List define how that same
knowledge is presented. List is a first-class central presentation, not a small
sidebar fallback. Changing presentation preserves the selected contextual view,
filters/search, and selected node; returning to Graph preserves its camera/layout.
The shared reader opens the selected node from either presentation.

The left sidebar is for choosing contexts and general navigation, principally
saved views and All knowledge, with diagnostics as a secondary bottom utility.
Remove most sidebar content/control duplication. Remove the sidebar node list and
graph Nodes dropdown once a full central List exists. Consolidate duplicate
Knowledge map/All knowledge destinations. Type and dimension filtering belongs
in the shared combobox, not independent sidebar controls. Keep one clear reset
for active constraints. Do not strand keyboard navigation when removing lists.

All knowledge remains an unfiltered entry point so users need not already know
the project's contexts and can discover nodes absent from saved views. It is a
flat contextual collection, not a folder tree. The list must make every matching
node reachable, rather than silently stopping at the current 150-node sidebar cap.

Graph supports understanding connections, clusters, and neighbors. List supports
scanning readable titles/descriptions, comparing metadata, and reviewing a set.
Keep the graph, node reader, incoming/outgoing connections, search/filtering,
saved views, dimension accents, zoom/Fit, and basic layout recovery. The right
reader remains an ephemeral overlay; the left sidebar occupies layout space.

## Initial proposals and boundaries

The accepted overall direction includes a simple list/table with title,
description, type, and dimension chips. Exact columns, sorting, and pagination
versus virtualization are implementation choices, not a finalized data-grid API.
Avoid editable cells, column builders, nested rows, and database-style configuration
in the first iteration. Graph-only controls should not clutter List mode.

Search should operate on the shared context, with snippets naturally presented
in List, rather than becoming a third destination replacing the workspace.
Exact full-text search interaction still needs design; do not claim it exists.

Earlier cleanup recommendations included hiding empty source/file sections,
removing permanent explanatory footer text, consolidating graph controls, and
lowering Arrange's prominence. User broadly endorsed simplification and keeping
the useful capabilities. Do not interpret that as individually finalized removal
of neighborhood focus, file previews, diagnostics, or annotation support.
Relationship filtering remains useful; its placement is open. Agentation as a
development-only tool was a suggestion, not an explicit removal decision.

## Implementation status

Accepted product direction, not implemented by this documentation change.
Existing explorer nodes describe current shipped behavior. These decisions guide
the next iteration and supersede older sidebar preferences for future changes.
