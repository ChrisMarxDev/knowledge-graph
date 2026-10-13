---
id: 8b5f3519-8965-4481-a913-ee6efba9222e
title: Stable visual identity and configurable colors
type: decision
description: "Preserve recognizable node colors across contexts using stable type colors and dimension accents, with repository-owned YAML overrides."
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
Dimension values retain their own recognizable accents. Preserve these meanings
across views, filtering, Graph/List presentation, and reader/hover surfaces.
Selection, focus, and hover may indicate state without remapping identity colors.
Authored type changes or intentional color configuration changes may change the
signature; navigating the app should not.

Replace the current Color by approach that changes the main fill by type or
selected dimension. The user's dissatisfaction with grouping is about preserving
visual identity; it is not authorization for a new spatial clustering algorithm.
Any future grouping should preserve the node's visual signature.

Provide a local/repository YAML configuration for overriding type colors and
dimension accents. It must support the project's freely chosen vocabulary and
remain understandable/editable as files. No hard-coded type taxonomy, remote
color service, or browser-only authoritative palette.

## Open implementation choices

The YAML filename/location/schema, fallback palette for unconfigured values,
validation, theme contrast handling, and live reload behavior remain undecided.
Defaults should be deterministic and avoid shifting existing colors when new
vocabulary or filtered subsets appear. Readability in light/dark themes matters,
but exact palette behavior is not yet agreed. Do not document a config format as
available before it is implemented.

## Implementation status

Accepted direction, not implemented. The current Color by control still exists.
