---
id: 2f56d1ca-a134-4a6e-a918-0b78c41e27a4
title: Evidence citations and referenced-file previews
type: concept
description: "Attach URL, local-file, or text evidence independently of graph
  links and preview local sources."
dimensions:
  feature:
    - graph
    - retrieval
  component:
    - cli
    - api
    - ui
    - files
  status:
    - implemented
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: depends_on
    target: 817d288b-1c68-4b51-9f67-5666325ec223
files:
  - src/sources.ts
  - src/explorer.ts
sources:
  - kind: file
    target: skills/use-kw/references/sources.md
---

# Evidence citations and referenced-file previews

## Citations

sources holds url, file, or reference entries with optional title, locator, and note. They are evidence metadata, separate from named node links and untyped files associations. kw source list/add/remove supports exact identity by kind, target, and locator. Re-adding updates supplied optional fields; removing without a locator does not remove other located citations.

File sources participate in context --file and explorer file backlinks. The reader displays citations, opens URL sources externally, and previews referenced UTF-8 project files in bounded pages. Project boundaries and file validation apply; binary/PDF rendering is not provided.

## Evidence limits

Source content is not fetched, indexed, imported, or automatically synchronized. Citation presence does not establish truth or assign highlight. Locators are human-readable, not executable selectors. Doctor diagnoses malformed and unsafe/missing local references without fetching URLs.
