---
id: 1ae164a4-e6b7-4b8e-92e5-6bb6dc8d4e54
title: Open questions and historical boundaries
type: question
description: Distinguish future requirements, proposals, and missing evidence
  from implemented behavior.
dimensions:
  feature:
    - product
links:
  - relation: part_of
    target: ca3a3288-b85a-4c1e-8b08-964be09341c0
files: []
sources:
  - kind: file
    target: agent-wiki-discussion.md
  - kind: file
    target: README.md
---

# Open questions and historical boundaries

## Unresolved and future work
The discussion confirms embeddings/vector search as a future requirement, but the current CLI exposes keyword retrieval only. Formal review workflows, automated source-authority conflict resolution, freshness, deletion and historical retention beyond committed Git revisions, and automatic injection remain open or deferred. The project now uses optional status markers, including an explicitly human-designated highlight for higher-authority source truth; this convention is implemented through existing metadata, not automatic ranking or conflict resolution.

The historical layout discussion considered Cytoscape.js/fCoSE, Graphology ForceAtlas2, and ELK Layered. That choice is now resolved in the implementation: the explorer uses Cytoscape.js/fCoSE with a cancellable layout worker, pinning, and persisted positions. Graphology and ELK remain historical alternatives, not active dependencies. Earlier notes saying the UI was deferred or view did not open a browser describe historical milestones superseded by later implementation. Illustrative early command syntax is not the current CLI contract.

## Missing evidence
The discussion cites developer-knowledge-system.md from an earlier conversation, but that document is absent from this checkout. It has not been imported or reconstructed. Inherited goals are available only as characterized in agent-wiki-discussion.md. External research links remain in that historical source and have not been freshly verified for initialization.

Preserve distinctions among user-confirmed direction, assistant proposals, implementation observations, and unresolved questions when extending this collection.
