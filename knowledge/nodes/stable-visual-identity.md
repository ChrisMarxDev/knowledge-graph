---
id: 8b5f3519-8965-4481-a913-ee6efba9222e
title: Stable visual identity and configurable colors
type: decision
description: "Preserve recognizable node colors across contexts using stable type colors and dimension accents, with repository-owned YAML overrides."
dimensions:
  feature: [product, explorer]
  component: [ui]
  status: [accepted, implemented]
links:
  - relation: part_of
    target: 70d0b2a5-3d35-4d89-a215-0c12e58c5405
files: [src/colors.ts, ui/graph-color.ts, ui/dimension-markers.ts, knowledge/meta.yaml]
sources:
  - kind: reference
    target: User explorer direction discussion, 2026-10-13
    note: Accepted intent and planned behavior; distinguish proposals from implementation.
---

# Stable visual identity and configurable colors

## Intent

Users should recognize the same knowledge as they navigate, filter, or switch
presentations. Recoloring nodes based on the currently selected grouping erodes
recognition and makes the app feel unfamiliar. A consistent visual signature
supports orientation and continuity. Colors should also be adjustable to the
project's aesthetic preferences rather than imposed by the tool.

## Accepted decisions

The user explicitly chose stable type colors with dimension accents, rather
than per-node identity colors. A node's main color represents its type consistently.
Dimensions retain recognizable accents; their values share the dimension color. Preserve these meanings
across views, filtering, Graph/List presentation, and reader/hover surfaces.
Selection, focus, and hover may indicate state without remapping identity colors.
Authored type changes or intentional color configuration changes may change the
signature; navigating the app should not.

Replace the current Color by approach that changes the main fill by type or
selected dimension. The user's dissatisfaction with grouping is about preserving
visual identity; it is not authorization for a new spatial clustering algorithm.
Any future grouping should preserve the node's visual signature.

## Configuration and defaults

User correction: colors belong as optional color parameters on the existing type
and dimension definitions in the configured metadata YAML. Do not add a separate
colors.yaml. A type color controls main fill; a dimension color controls accents
for all of its values. Both accept quoted #RRGGBB strings. Unknown vocabulary is
supported and no particular type names are required.

Unconfigured type colors are deterministic hashes into the default palette;
dimension accents hash the dimension name. Neither changes with encounter order,
filtering, or new vocabulary. Graph, list, hover, and reader use the same values.
Normal theme foregrounds keep chip labels readable independently of accent hue.
Overrides are used as authored in both themes; automatic contrast correction is
not performed. Invalid entries yield INVALID_COLOR doctor warnings and an explorer
notice, use defaults, and do not invalidate other overrides. Polling applies edits
without restarting or rearranging; colors participate in snapshot version/ETag.

## Implementation status

Implemented 2026-10-13. The Color by selector and clickable recoloring/highlight
legend are removed; a passive type legend remains. Spatial grouping is unchanged.
