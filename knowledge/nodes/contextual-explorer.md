---
id: 8f60e5ac-d848-4803-8f3d-eb975bf3b1f8
title: Contextual views with Graph and List presentations
type: decision
description: "Make contextual knowledge the navigation model; give Graph and List equal standing while reducing sidebar duplication."
dimensions:
  feature: [product, explorer]
  component: [ui]
  status: [accepted, implemented]
links:
  - relation: part_of
    target: 70d0b2a5-3d35-4d89-a215-0c12e58c5405
files: [ui/main.tsx, ui/NodeList.tsx, ui/GraphView.tsx]
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

## Implementation choices and boundaries

List has separate name, description, type, and dimension columns, with sortable column headers
and 50-row pagination. Every matching node is reachable. Graph stays mounted
while hidden to preserve its camera and layout. List preserves its page across
mode switching; membership/sort changes reset pagination. Graph-only controls
remain in Graph. There are no editable cells or custom column builders.

Full-text search opens List with snippets and constrains both modes to returned
matches. It retains the existing bounded endpoint behavior, not exhaustive
collection search. Relationship filtering remains a shared context control.

Earlier cleanup recommendations included hiding empty source/file sections,
removing permanent explanatory footer text, consolidating graph controls, and
lowering Arrange's prominence. User broadly endorsed simplification and keeping
the useful capabilities. Do not interpret that as individually finalized removal
of neighborhood focus, file previews, diagnostics, or annotation support.
Relationship filtering lives in the Filters popover beside search. Agentation as a
development-only tool was a suggestion, not an explicit removal decision.

## Implementation status

Implemented 2026-10-13. Empty file/source sections, duplicate navigation and node
lists, sidebar metadata filters, and the permanent graph footer are removed.
Diagnostics, annotation, file previews, and neighborhood focus remain available.

## Compact table workspace

Breadcrumbs are a small, single-line context indicator. Graph/List is the primary
toggle immediately left of search in one toolbar. The separate presentation and
sorting rows are removed; view descriptions remain in sidebar navigation.
Relationship, neighborhood, and document-search controls are in the Filters
popover, marked when active. Clear filters remains beside search. Counts and
pagination sit below the table.

List is a compact property table with column/row borders: Name, Description, Type,
and one column per observed dimension. Every column header is a sort button;
click again to reverse direction. aria-sort exposes direction to assistive tech.
Text sorting is natural and case-insensitive; dimension values are sorted/joined
for comparison, with missing values treated as empty. Title/path break ties.
Name and description cells truncate with full text on hover; the reader holds
complete content. Dimension chips wrap within their property cell. Tables scroll
horizontally on narrow screens; 50-row pagination remains.
