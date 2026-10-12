---
id: 817d288b-1c68-4b51-9f67-5666325ec223
title: Stable identity and explicit evidence links
type: concept
description: Separate conceptual graph edges, implementation file associations,
  and supporting citations.
dimensions:
  feature:
    - graph
  component:
    - cli
    - api
    - files
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: governed_by
    target: f9f23b8e-cb57-4286-98ed-1424828f5477
files:
  - src/core.ts
  - src/sources.ts
sources:
  - kind: file
    target: skills/use-kw/references/cli.md
  - kind: file
    target: skills/use-kw/references/sources.md
---

# Stable identity and explicit evidence links

## Stable references
Generated node IDs are UUID v4; existing valid name-based IDs work too. IDs remain stable across content edits and file renames. Authored heading annotations such as {#section-id} allow ID#section-id targets independently of heading text. Embedding chunks are derived units, not canonical identities.

## Associations
links are named directed edges to nodes or sections. files are untyped project-relative associations. sources cite URLs, local files, or textual references with optional title, locator, and note. A citation does not establish authority or create a conceptual edge.

Raw file paths do not automatically follow renames, and Markdown hyperlinks are not graph edges. File sources can match query --file and support previews, but source content is not fetched or indexed. Doctor checks structure and local references without fetching URLs.
