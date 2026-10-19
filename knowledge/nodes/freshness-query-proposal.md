---
id: 5d90ce97-62df-4824-85cf-d0e97b92173e
title: Knowledge freshness and retrieval proposal
type: concept
description: Historical checkpoint proposal superseded by Git-based review; keyword alternatives are implemented; semantic retrieval remains proposed.
dimensions:
  feature: [retrieval, authoring]
  component: [cli, api, files]
  status: [proposed]
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
  - relation: governed_by
    target: 8f0e952a-0d52-4d41-92cd-00e32c536ab3
files:
  - concept/features/freshness-query.html
  - concept/features/index.html
sources:
  - kind: reference
    target: Christopher's Graphify comparison discussion, 2026-10-19
    note: Requested a technical concept and API effects before any implementation; knowledge relationships cannot be assumed from code structure.
  - kind: url
    target: https://github.com/Graphify-Labs/graphify/tree/86c57be
    note: Source review found agent-side expansion, lexical seed matching, and graph traversal; no comparative evidence of better retrieval for kw.
---

# Knowledge freshness and retrieval proposal

The checkpoint design in the [technical concept](../../concept/features/freshness-query.html)
was superseded by the approved Git-based review implementation. There are no
review hashes, timestamps, approval records, or persisted state. Refer to the
[implemented CLI contract](cli-api-surface.md#review-knowledge-affected-by-git-changes)
for `kw review`, `--staged`, and `--base` semantics.

Alternative keyword queries and explanations are now implemented; see the
[query contract](cli-api-surface.md#alternative-keyword-queries-and-explanations).
Semantic retrieval remains proposed, not accepted or implemented. The [planned-feature index](../../concept/features/index.html)
contains those remaining proposals only. The historical checkpoint examples and
checkpoint-dependent query/HTTP features are not current or planned APIs.
